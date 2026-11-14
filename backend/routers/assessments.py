from datetime import datetime
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import (
    get_current_user,
    get_current_faculty,
    get_current_student,
)

router = APIRouter(prefix="/api/assessments", tags=["Assessments & Quizzes"])


@router.get("")
def get_assessments(
    subject_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Assessment)
    if subject_id:
        query = query.filter(models.Assessment.subject_id == subject_id)

    assessments = query.order_by(models.Assessment.created_at.desc()).all()
    results = []

    for a in assessments:
        student_result = None
        if current_user.role == "STUDENT" and current_user.student_profile:
            res = next((r for r in a.results if r.student_id == current_user.student_profile.id), None)
            if res:
                student_result = {
                    "id": res.id,
                    "score": res.score,
                    "total_marks": res.total_marks,
                    "completed_at": res.completed_at.isoformat()
                }

        results.append({
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "subject_id": a.subject_id,
            "subject_name": a.subject.name if a.subject else "Subject",
            "subject_code": a.subject.code if a.subject else "",
            "faculty_name": a.faculty.user.full_name if a.faculty else "Faculty",
            "duration_minutes": a.duration_minutes,
            "total_marks": a.total_marks,
            "question_count": len(a.questions),
            "is_published": a.is_published,
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "created_at": a.created_at.isoformat(),
            "attempts_count": len(a.results),
            "student_result": student_result
        })

    return results


@router.post("", status_code=status.HTTP_201_CREATED)
def create_assessment(
    payload: schemas.AssessmentCreateRequest,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    """Faculty creates a new assessment with MCQ questions."""
    due_dt = None
    if payload.due_date:
        try:
            due_dt = datetime.fromisoformat(payload.due_date.replace("Z", "+00:00"))
        except Exception:
            pass

    assessment = models.Assessment(
        title=payload.title,
        description=payload.description,
        subject_id=payload.subject_id,
        faculty_id=faculty.id,
        duration_minutes=payload.duration_minutes,
        total_marks=payload.total_marks,
        is_published=True,
        due_date=due_dt
    )
    db.add(assessment)
    db.flush()

    for q in payload.questions:
        question = models.Question(
            assessment_id=assessment.id,
            question_text=q.question_text,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            correct_option=q.correct_option.strip().upper(),
            marks=q.marks
        )
        db.add(question)

    # Notify all enrolled students
    students = db.query(models.Student).all()
    for s in students:
        notif = models.Notification(
            user_id=s.user.id,
            title="New Assessment Published",
            message=f"Assessment '{assessment.title}' is now available ({payload.duration_minutes} mins, {len(payload.questions)} questions).",
            type="ASSESSMENT",
            link="/assessments"
        )
        db.add(notif)

    db.commit()
    return {"success": True, "message": "Assessment created and published successfully!", "assessment_id": assessment.id}


@router.get("/{assessment_id}")
def get_assessment_details(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Returns assessment details. For students, correct answers are hidden during the test."""
    assessment = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    is_student = (current_user.role == "STUDENT")
    student_attempt = None
    if is_student and current_user.student_profile:
        student_attempt = db.query(models.AssessmentResult).filter(
            models.AssessmentResult.assessment_id == assessment_id,
            models.AssessmentResult.student_id == current_user.student_profile.id
        ).first()

    questions = []
    for q in assessment.questions:
        q_dict = {
            "id": q.id,
            "question_text": q.question_text,
            "option_a": q.option_a,
            "option_b": q.option_b,
            "option_c": q.option_c,
            "option_d": q.option_d,
            "marks": q.marks,
        }
        # Only show correct option to faculty or students who have already submitted
        if not is_student or student_attempt is not None:
            q_dict["correct_option"] = q.correct_option
        questions.append(q_dict)

    result_data = None
    if student_attempt:
        result_data = {
            "score": student_attempt.score,
            "total_marks": student_attempt.total_marks,
            "answers": student_attempt.answers_json,
            "completed_at": student_attempt.completed_at.isoformat()
        }

    return {
        "id": assessment.id,
        "title": assessment.title,
        "description": assessment.description,
        "subject_name": assessment.subject.name if assessment.subject else "",
        "duration_minutes": assessment.duration_minutes,
        "total_marks": assessment.total_marks,
        "questions": questions,
        "student_attempt": result_data
    }


@router.post("/{assessment_id}/submit")
def submit_assessment_attempt(
    assessment_id: int,
    payload: schemas.AssessmentAttemptSubmit,
    db: Session = Depends(get_db),
    student: models.Student = Depends(get_current_student)
):
    """Student submits answers for an assessment and gets instant automatic scoring."""
    assessment = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    existing = db.query(models.AssessmentResult).filter(
        models.AssessmentResult.assessment_id == assessment_id,
        models.AssessmentResult.student_id == student.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted this assessment.")

    # Calculate score
    score = 0
    total_marks = 0
    for q in assessment.questions:
        total_marks += q.marks
        user_answer = payload.answers.get(str(q.id), "").strip().upper()
        if user_answer == q.correct_option:
            score += q.marks

    result = models.AssessmentResult(
        assessment_id=assessment.id,
        student_id=student.id,
        score=score,
        total_marks=total_marks,
        answers_json=payload.answers,
        completed_at=datetime.utcnow()
    )
    db.add(result)

    # Notify faculty
    faculty_user = assessment.faculty.user
    notif = models.Notification(
        user_id=faculty_user.id,
        title="Assessment Attempt Completed",
        message=f"{student.user.full_name} completed '{assessment.title}'. Score: {score}/{total_marks}.",
        type="ASSESSMENT",
        link="/assessments"
    )
    db.add(notif)

    db.commit()

    pct = round((score / total_marks * 100.0), 1) if total_marks > 0 else 0.0
    return {
        "success": True,
        "score": score,
        "total_marks": total_marks,
        "percentage": pct,
        "message": f"Assessment completed! You scored {score} out of {total_marks} ({pct}%)."
    }


@router.get("/{assessment_id}/results")
def get_assessment_results(
    assessment_id: int,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    """Faculty reviews all student results for an assessment."""
    assessment = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    results = db.query(models.AssessmentResult).filter(
        models.AssessmentResult.assessment_id == assessment_id
    ).all()

    items = []
    for r in results:
        pct = round((r.score / r.total_marks * 100.0), 1) if r.total_marks > 0 else 0.0
        items.append({
            "id": r.id,
            "student_id": r.student_id,
            "roll_number": r.student.roll_number,
            "student_name": r.student.user.full_name,
            "avatar": r.student.user.avatar,
            "department": r.student.department,
            "score": r.score,
            "total_marks": r.total_marks,
            "percentage": pct,
            "completed_at": r.completed_at.isoformat(),
            "ai_generated_pct": r.ai_generated_pct or 0.0,
            "ai_status": r.ai_status or "0% AI Used",
            "is_ai_flagged": bool(r.is_ai_flagged)
        })

    return {
        "assessment_id": assessment.id,
        "title": assessment.title,
        "total_marks": assessment.total_marks,
        "total_attempts": len(items),
        "results": items
    }


@router.post("/results/{result_id}/flag-ai")
def flag_assessment_ai(
    result_id: int,
    db: Session = Depends(get_db),
    faculty: models.Faculty = Depends(get_current_faculty)
):
    """Faculty flags assessment attempt for AI tools usage; sets score to 0."""
    res = db.query(models.AssessmentResult).filter(models.AssessmentResult.id == result_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Assessment result not found")

    res.score = 0.0
    res.is_ai_flagged = True
    res.ai_generated_pct = 95.0
    res.ai_status = "AI Tools Detected - Marks 0"
    db.commit()
    return {"success": True, "score": 0.0, "message": "Assessment score set to 0 due to AI tool detection."}

