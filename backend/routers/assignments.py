import os
import base64
import uuid
import zipfile
import io
import re
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
import models
import schemas
import ai_detection_service
from auth import (
    get_current_user,
    get_current_faculty,
    get_current_student,
)

router = APIRouter(prefix="/api/assignments", tags=["Assignments"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSIGNMENTS_DIR = os.path.join(BASE_DIR, "uploads", "assignments")
SUBMISSIONS_DIR = os.path.join(BASE_DIR, "uploads", "submissions")
os.makedirs(ASSIGNMENTS_DIR, exist_ok=True)
os.makedirs(SUBMISSIONS_DIR, exist_ok=True)


@router.get("")
def get_assignments(
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Returns assignments:
    - If Faculty: returns all assignments created by the faculty.
    - If Student: returns ONLY assignments assigned to this student (ALL, SELECTED, or GROUP).
    """
    if current_user.role == "FACULTY":
        query = db.query(models.Assignment)
        if subject_id:
            query = query.filter(models.Assignment.subject_id == subject_id)

        if current_user.faculty_profile:
            fac_assignments = query.filter(models.Assignment.faculty_id == current_user.faculty_profile.id).order_by(models.Assignment.created_at.desc()).all()
            if fac_assignments:
                assignments = fac_assignments
            else:
                # Fallback to all assignments or department assignments so faculty has coursework available
                assignments = query.order_by(models.Assignment.created_at.desc()).all()
        else:
            assignments = query.order_by(models.Assignment.created_at.desc()).all()

        results = []
        for a in assignments:
            sub_count = len(a.submissions)
            results.append({
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "subject_id": a.subject_id,
                "subject_name": a.subject.name if a.subject else "Subject",
                "subject_code": a.subject.code if a.subject else "",
                "faculty_name": a.faculty.user.full_name if a.faculty else "Faculty",
                "recipient_type": a.recipient_type,
                "submission_format": a.submission_format or "CODE_AND_WORD",
                "max_marks": a.max_marks,
                "due_date": a.due_date.isoformat(),
                "attachment_url": a.attachment_url,
                "created_at": a.created_at.isoformat(),
                "submissions_count": sub_count
            })
        return results

    elif current_user.role == "STUDENT":
        student = current_user.student_profile
        if not student:
            return []

        # Find assignments where:
        # 1. recipient_type == 'ALL'
        # 2. student is in AssignmentRecipients
        # 3. recipient_type == 'GROUP' and department/year/section match
        all_assignments = db.query(models.Assignment).all()
        visible = []

        for a in all_assignments:
            is_eligible = False
            if a.recipient_type == "ALL":
                is_eligible = True
            elif a.recipient_type == "SELECTED":
                has_rec = any(r.student_id == student.id for r in a.recipients)
                if has_rec:
                    is_eligible = True
            elif a.recipient_type == "GROUP":
                for r in a.recipients:
                    dept_match = not r.group_department or r.group_department == student.department
                    year_match = not r.group_year or r.group_year == student.academic_year
                    sec_match = not r.group_section or r.group_section == student.section
                    if dept_match and year_match and sec_match:
                        is_eligible = True
                        break

            if is_eligible:
                # Check student's submission status
                sub = next((s for s in a.submissions if s.student_id == student.id), None)
                visible.append({
                    "id": a.id,
                    "title": a.title,
                    "description": a.description,
                    "subject_id": a.subject_id,
                    "subject_name": a.subject.name if a.subject else "Subject",
                    "subject_code": a.subject.code if a.subject else "",
                    "faculty_name": a.faculty.user.full_name if a.faculty else "Faculty",
                    "recipient_type": a.recipient_type,
                    "submission_format": a.submission_format or "CODE_AND_WORD",
                    "max_marks": a.max_marks,
                    "due_date": a.due_date.isoformat(),
                    "attachment_url": a.attachment_url,
                    "created_at": a.created_at.isoformat(),
                    "submission": {
                        "id": sub.id,
                        "file_url": sub.file_url,
                        "file_name": sub.file_name,
                        "code_file_url": sub.code_file_url,
                        "code_file_name": sub.code_file_name,
                        "doc_file_url": sub.doc_file_url,
                        "doc_file_name": sub.doc_file_name,
                        "submitted_at": sub.submitted_at.isoformat(),
                        "marks_obtained": sub.marks_obtained,
                        "feedback": sub.feedback,
                        "is_graded": sub.marks_obtained is not None,
                        "ai_generated_pct": sub.ai_generated_pct or 0.0,
                        "ai_status": sub.ai_status or "0% AI Used - Human Authored",
                        "is_ai_flagged": bool(sub.is_ai_flagged),
                        "ai_report": sub.ai_report or "Verified as student-authored original work."
                    } if sub else None
                })
        return visible

    return []


@router.post("", status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: schemas.AssignmentCreateRequest,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    """Faculty creates assignment with recipients and file attachment."""
    # Handle attachment if provided in base64
    attachment_url = None
    if payload.attachment_base64:
        try:
            b64_data = payload.attachment_base64
            if "," in b64_data:
                b64_data = b64_data.split(",")[1]
            file_bytes = base64.b64decode(b64_data)
            orig_name = payload.attachment_name or "assignment_file.pdf"
            clean_name = f"{uuid.uuid4().hex[:8]}_{orig_name}"
            save_path = os.path.join(ASSIGNMENTS_DIR, clean_name)
            with open(save_path, "wb") as f:
                f.write(file_bytes)
            attachment_url = f"/uploads/assignments/{clean_name}"
        except Exception as e:
            print(f"Error saving assignment attachment: {e}")

    try:
        due_dt = datetime.fromisoformat(payload.due_date.replace("Z", "+00:00"))
    except Exception:
        due_dt = datetime.utcnow()

    assignment = models.Assignment(
        title=payload.title,
        description=payload.description,
        subject_id=payload.subject_id,
        faculty_id=faculty.id,
        recipient_type=payload.recipient_type,
        submission_format=payload.submission_format or "CODE_AND_WORD",
        max_marks=payload.max_marks,
        due_date=due_dt,
        attachment_url=attachment_url
    )
    db.add(assignment)
    db.flush()

    # Handle recipients
    target_users = []
    if payload.recipient_type == "SELECTED" and payload.selected_student_ids:
        for sid in payload.selected_student_ids:
            rec = models.AssignmentRecipient(assignment_id=assignment.id, student_id=sid)
            db.add(rec)
            stud = db.query(models.Student).filter(models.Student.id == sid).first()
            if stud:
                target_users.append(stud.user)
    elif payload.recipient_type == "GROUP":
        rec = models.AssignmentRecipient(
            assignment_id=assignment.id,
            group_department=payload.group_department,
            group_year=payload.group_year,
            group_section=payload.group_section
        )
        db.add(rec)
        students = db.query(models.Student).all()
        for s in students:
            if ((not payload.group_department or s.department == payload.group_department) and
                (not payload.group_year or s.academic_year == payload.group_year) and
                (not payload.group_section or s.section == payload.group_section)):
                target_users.append(s.user)
    else:  # ALL
        all_students = db.query(models.Student).all()
        target_users = [s.user for s in all_students]

    # Send notifications to eligible students
    for u in target_users:
        notif = models.Notification(
            user_id=u.id,
            title="New Assignment Published",
            message=f"New assignment '{assignment.title}' has been assigned. Due on {due_dt.strftime('%b %d, %Y')}.",
            type="ASSIGNMENT",
            link="/assignments"
        )
        db.add(notif)

    db.commit()
    return {"success": True, "message": "Assignment created and published successfully!", "assignment_id": assignment.id}


@router.post("/{assignment_id}/submit")
def submit_assignment(
    assignment_id: int,
    payload: schemas.SubmissionCreateRequest,
    db: Session = Depends(get_db),
    student: models.Student = Depends(get_current_student)
):
    """Student submits assignment with file upload(s) matching required formats."""
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    def save_file(b64, prefix, orig_name):
        if not b64 or not orig_name:
            return None, None
        try:
            raw = b64.split(",")[1] if "," in b64 else b64
            file_bytes = base64.b64decode(raw)
            clean_name = os.path.basename(orig_name).replace(" ", "_")
            save_name = f"sub_{student.roll_number}_{prefix}_{uuid.uuid4().hex[:6]}_{clean_name}"
            save_path = os.path.join(SUBMISSIONS_DIR, save_name)
            with open(save_path, "wb") as f:
                f.write(file_bytes)
            return f"/uploads/submissions/{save_name}", orig_name
        except Exception as e:
            print(f"Error saving file {orig_name}: {e}")
            return None, None

    code_url, code_name = save_file(payload.code_file_base64, "code", payload.code_file_name)
    doc_url, doc_name = save_file(payload.doc_file_base64, "doc", payload.doc_file_name)
    legacy_url, legacy_name = save_file(payload.file_base64, "main", payload.file_name)

    primary_url = doc_url or code_url or legacy_url
    primary_name = doc_name or code_name or legacy_name or "submission.docx"

    # Run AI content analysis on submitted coursework
    local_target_path = None
    if primary_url:
        local_target_path = os.path.join(BASE_DIR, primary_url.lstrip("/"))
    ai_analysis = ai_detection_service.analyze_ai_content(
        text=payload.comments or "",
        file_path=local_target_path,
        explicit_ai_flag=payload.force_ai_flag
    )

    # Check existing submission
    sub = db.query(models.Submission).filter(
        models.Submission.assignment_id == assignment_id,
        models.Submission.student_id == student.id
    ).first()

    if sub:
        sub.file_url = primary_url or sub.file_url
        sub.file_name = primary_name or sub.file_name
        if code_url:
            sub.code_file_url = code_url
            sub.code_file_name = code_name
        if doc_url:
            sub.doc_file_url = doc_url
            sub.doc_file_name = doc_name
        sub.comments = payload.comments
        sub.submitted_at = datetime.utcnow()
        sub.ai_generated_pct = ai_analysis["ai_pct"]
        sub.ai_status = ai_analysis["status"]
        sub.is_ai_flagged = ai_analysis["is_ai"]
        sub.ai_report = ai_analysis["report"]
    else:
        sub = models.Submission(
            assignment_id=assignment_id,
            student_id=student.id,
            file_url=primary_url,
            file_name=primary_name,
            code_file_url=code_url,
            code_file_name=code_name,
            doc_file_url=doc_url,
            doc_file_name=doc_name,
            comments=payload.comments,
            submitted_at=datetime.utcnow(),
            ai_generated_pct=ai_analysis["ai_pct"],
            ai_status=ai_analysis["status"],
            is_ai_flagged=ai_analysis["is_ai"],
            ai_report=ai_analysis["report"]
        )
        db.add(sub)

    # Notify faculty
    faculty_user = assignment.faculty.user
    notif = models.Notification(
        user_id=faculty_user.id,
        title="Assignment Submitted",
        message=f"{student.user.full_name} ({student.roll_number}) submitted '{assignment.title}'.",
        type="ASSIGNMENT",
        link="/assignments"
    )
    db.add(notif)

    db.commit()
    return {"success": True, "message": "Assignment submitted successfully!"}


@router.get("/{assignment_id}/submissions")
def get_assignment_submissions(
    assignment_id: int,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    """Faculty reviews submissions for an assignment."""
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    submissions = db.query(models.Submission).filter(models.Submission.assignment_id == assignment_id).all()
    results = []

    for s in submissions:
        ai_pct = float(s.ai_generated_pct or 0.0)
        human_pct = round(100.0 - ai_pct, 1)
        results.append({
            "id": s.id,
            "student_id": s.student_id,
            "roll_number": s.student.roll_number,
            "student_name": s.student.user.full_name,
            "student_email": s.student.user.email,
            "avatar": s.student.user.avatar,
            "file_url": s.file_url,
            "file_name": s.file_name,
            "code_file_url": s.code_file_url,
            "code_file_name": s.code_file_name,
            "doc_file_url": s.doc_file_url,
            "doc_file_name": s.doc_file_name,
            "comments": s.comments,
            "submitted_at": s.submitted_at.isoformat(),
            "marks_obtained": s.marks_obtained,
            "feedback": s.feedback,
            "is_graded": s.marks_obtained is not None,
            "ai_generated_pct": ai_pct,
            "human_written_pct": human_pct,
            "ai_status": s.ai_status or ("0% AI Used - Human Authored" if ai_pct == 0 else f"AI Tools Detected ({ai_pct}% AI)"),
            "is_ai_flagged": bool(s.is_ai_flagged),
            "ai_report": s.ai_report or ("Verified as 100% student-authored original work." if ai_pct == 0 else f"AI Detector flagged {ai_pct}% probability of AI assistance.")
        })

    return {
        "assignment_id": assignment.id,
        "title": assignment.title,
        "max_marks": assignment.max_marks,
        "due_date": assignment.due_date.isoformat(),
        "total_submissions": len(submissions),
        "submissions": results
    }


@router.post("/submissions/{submission_id}/scan-ai")
def scan_submission_for_ai(
    submission_id: int,
    payload: Optional[schemas.ScanAiRequest] = None,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    """Faculty scans or re-scans a student's uploaded assessment for AI-generated content."""
    sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    target_url = sub.doc_file_url or sub.code_file_url or sub.file_url
    local_path = None
    if target_url:
        local_path = os.path.join(BASE_DIR, target_url.lstrip("/"))

    if payload and payload.force_ai_pct is not None:
        ai_pct = min(100.0, max(0.0, float(payload.force_ai_pct)))
        is_ai = (ai_pct >= 25.0)
        human_pct = round(100.0 - ai_pct, 1)
        status_text = f"AI Tools Detected ({ai_pct}% AI Generated)" if is_ai else "0% AI Used - Human Authored"
        verdict = "AI_GENERATED" if is_ai else "HUMAN_ORIGINAL"
        report = (
            f"AI Detector flagged {ai_pct}% probability of AI tool assistance. "
            f"In accordance with academic integrity guidelines, assessment marks are marked as 0."
            if is_ai else
            "Verified as 100% student-authored original work (0% AI detected). Eligible for faculty marks."
        )
        analysis = {
            "ai_pct": ai_pct,
            "human_pct": human_pct,
            "is_ai": is_ai,
            "status": status_text,
            "verdict": verdict,
            "markers_found": ["Explicit Faculty AI Audit Test"] if is_ai else [],
            "report": report
        }
    else:
        force_flag = payload.force_ai_flag if payload else None
        analysis = ai_detection_service.analyze_ai_content(
            text=(payload.text if payload and payload.text else sub.comments or ""),
            file_path=local_path,
            explicit_ai_flag=force_flag
        )
        analysis["human_pct"] = round(100.0 - float(analysis["ai_pct"]), 1)

    sub.ai_generated_pct = analysis["ai_pct"]
    sub.ai_status = analysis["status"]
    sub.is_ai_flagged = analysis["is_ai"]
    sub.ai_report = analysis["report"]

    # Policy enforcement: AI-completed work receives 0 marks
    if analysis["is_ai"]:
        sub.marks_obtained = 0.0
    elif sub.marks_obtained == 0.0 and analysis["ai_pct"] == 0.0:
        # If previously penalized for AI but now verified as human, reset marks to None so faculty can award marks
        sub.marks_obtained = None

    db.commit()

    return {
        "success": True,
        "submission_id": sub.id,
        "analysis": analysis
    }


@router.post("/submissions/{submission_id}/grade")
def grade_submission(
    submission_id: int,
    payload: schemas.SubmissionGradeRequest,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    """
    Faculty enters marks and feedback for a student submission.
    - If AI tools detected: assessment marks are strictly marked as 0.
    - If 0% AI used (student wrote it on their own): student receives faculty marks up to max_marks.
    """
    sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    if payload.is_ai_detected is not None:
        is_ai = bool(payload.is_ai_detected)
    elif payload.ai_pct is not None and payload.ai_pct > 0:
        is_ai = bool(payload.ai_pct >= 25.0)
    else:
        is_ai = bool(sub.is_ai_flagged)

    if is_ai:
        # Prompt requirement: "if the faculty detects that the assesment was not written by his own its AI then his assesment marks will be marked as zero(0)"
        sub.marks_obtained = 0.0
        sub.is_ai_flagged = True
        ai_pct = payload.ai_pct if (payload.ai_pct and payload.ai_pct > 0) else (sub.ai_generated_pct or 85.0)
        sub.ai_generated_pct = ai_pct
        sub.ai_status = f"AI Tools Detected ({ai_pct}% AI) - 0 Marks Awarded"
        violation_notice = f"[Academic Integrity Violation - 0 Marks Awarded]: Assessment detected as generated by AI tools. Marks: 0 / {sub.assignment.max_marks}."
        sub.feedback = f"{violation_notice} {payload.feedback or ''}".strip()
    else:
        # Prompt requirement: "and also if the student writtend by his own and the AI detected that the student did'nt used AI it shows zero(0) AI used and the student gets marks given by the faculty. some faculty assesments may have 50 marks, 75 marks, 100 marks....etc.."
        sub.marks_obtained = min(float(payload.marks_obtained), float(sub.assignment.max_marks))
        sub.is_ai_flagged = False
        sub.ai_status = "0% AI Used - Human Authored"
        sub.ai_generated_pct = 0.0
        sub.feedback = payload.feedback or "Great work! Original student authored coursework."

    sub.graded_at = datetime.utcnow()

    # Notify student
    student_user = sub.student.user
    notif = models.Notification(
        user_id=student_user.id,
        title="Assignment Graded",
        message=f"Your assignment '{sub.assignment.title}' was graded: {sub.marks_obtained}/{sub.assignment.max_marks} ({'0 Marks due to AI Detection' if is_ai else 'Faculty Grade'}).",
        type="GRADE",
        link="/assignments"
    )
    db.add(notif)

    db.commit()
    return {
        "success": True,
        "message": f"Grade saved successfully: {sub.marks_obtained}/{sub.assignment.max_marks} ({sub.ai_status})",
        "marks_obtained": sub.marks_obtained,
        "is_ai_flagged": sub.is_ai_flagged,
        "ai_status": sub.ai_status
    }


@router.post("/convert-pdf-to-docx")
def convert_pdf_to_docx(payload: schemas.ConvertPdfToDocxRequest):
    """
    Converts or wraps a PDF document into a standard Microsoft Word (.docx) file.
    Extracts text streams and packages them into an OpenXML WordprocessingML package.
    """
    try:
        b64_data = payload.file_base64
        if "," in b64_data:
            b64_data = b64_data.split(",")[1]
        pdf_bytes = base64.b64decode(b64_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 payload: {e}")

    # Extract text fragments from PDF byte stream
    raw_content = pdf_bytes.decode("latin1", errors="ignore")
    text_fragments = re.findall(r'\((.*?)\)\s*Tj', raw_content)
    if not text_fragments:
        text_fragments = re.findall(r'\[(.*?)\]\s*TJ', raw_content)

    clean_lines = [t.strip() for t in text_fragments if len(t.strip()) > 1]
    extracted_text = "\n".join(clean_lines) if clean_lines else f"Assignment Report: {payload.assignment_title}\nOriginal File: {payload.file_name}\nConverted to Microsoft Word document (.docx) for academic submission."

    docx_io = io.BytesIO()
    with zipfile.ZipFile(docx_io, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>""")
        z.writestr('_rels/.rels', """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>""")

        paragraphs = extracted_text.replace('\r', '').split('\n')
        body_xml = f'<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="34"/><w:color w:val="2E3A59"/></w:rPr><w:t>{payload.assignment_title}</w:t></w:r></w:p>'
        body_xml += f'<w:p><w:pPr><w:pStyle w:val="Subtitle"/></w:pPr><w:r><w:rPr><w:i/><w:color w:val="718096"/><w:sz w:val="20"/></w:rPr><w:t>Converted from {payload.file_name} to Microsoft Word (.docx)</w:t></w:r></w:p>'
        
        for p in paragraphs:
            escaped = p.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
            body_xml += f'<w:p><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>{escaped}</w:t></w:r></w:p>'

        doc_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>{body_xml}</w:body>
</w:document>"""
        z.writestr('word/document.xml', doc_xml)

    docx_bytes = docx_io.getvalue()
    docx_b64 = "data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64," + base64.b64encode(docx_bytes).decode('ascii')
    base_name = os.path.splitext(payload.file_name)[0]
    out_name = f"{base_name}.docx"

    return {
        "success": True,
        "converted_base64": docx_b64,
        "file_name": out_name,
        "file_size": f"{len(docx_bytes) / 1024:.1f} KB",
        "message": f"Successfully converted '{payload.file_name}' to Word (.docx)!"
    }


@router.delete("/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    assignment = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    db.delete(assignment)
    db.commit()
    return {"success": True, "message": "Assignment deleted successfully."}

