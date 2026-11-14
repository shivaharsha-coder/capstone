import sys
import os

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from datetime import datetime, date, timedelta
from database import SessionLocal, Base, engine
import models
from auth import hash_password

# Initialize tables
Base.metadata.create_all(bind=engine)


def ensure_admin_and_departments(db):
    """Ensures Admin user, departments, and system settings are seeded."""
    # 1. Admin User
    admin = db.query(models.User).filter(models.User.email == "admin@smartclassroom.edu").first()
    if not admin:
        admin = models.User(
            email="admin@smartclassroom.edu",
            username="admin",
            password_hash=hash_password("Admin@1234"),
            role="ADMIN",
            full_name="System Administrator",
            avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
            is_active=True
        )
        db.add(admin)
        db.flush()
        print("✓ Created default Administrator account: admin@smartclassroom.edu")

    # 2. Departments
    dept_presets = [
        {"code": "CSE", "name": "Computer Science & Engineering", "hod": "Dr. Rajesh Sharma", "intake": 180},
        {"code": "ECE", "name": "Electronics & Communication Engineering", "hod": "Dr. S. K. Rao", "intake": 120},
        {"code": "IT", "name": "Information Technology", "hod": "Dr. Anita Desai", "intake": 120},
        {"code": "MECH", "name": "Mechanical Engineering", "hod": "Dr. K. V. Raman", "intake": 60},
        {"code": "CIVIL", "name": "Civil Engineering", "hod": "Dr. M. N. Reddy", "intake": 60},
    ]
    for d in dept_presets:
        existing = db.query(models.Department).filter(models.Department.code == d["code"]).first()
        if not existing:
            db.add(models.Department(
                code=d["code"],
                name=d["name"],
                head_of_department=d["hod"],
                intake=d["intake"],
                description=f"Department of {d['name']} with specialized research laboratories."
            ))
            print(f"✓ Seeded department: {d['code']}")

    # 3. System Settings
    settings_presets = [
        {"key": "academic_year", "value": "2026-2027", "desc": "Current Active Academic Year"},
        {"key": "current_semester", "value": "Even Semester (Spring 2027)", "desc": "Active Semester"},
        {"key": "phone_detection_threshold", "value": "0.20", "desc": "YOLO Confidence Threshold for Smartphone Alert"},
        {"key": "face_recognition_threshold", "value": "0.68", "desc": "YuNet Cosine Similarity Match Threshold"},
        {"key": "monitoring_alert_sound", "value": "enabled", "desc": "Audio Beep on Mobile Phone Alert"},
    ]
    for s in settings_presets:
        existing = db.query(models.SystemSetting).filter(models.SystemSetting.key == s["key"]).first()
        if not existing:
            db.add(models.SystemSetting(
                key=s["key"],
                value=s["value"],
                description=s["desc"]
            ))

    db.commit()


def seed_database(force=False):
    db = SessionLocal()

    # Ensure admin, departments and settings exist regardless of previous faculty seeding
    ensure_admin_and_departments(db)

    if force:
        print("Cleaning old tables for fresh re-seed...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        ensure_admin_and_departments(db)
    elif db.query(models.User).filter(models.User.email == "blockchain.faculty@smartclassroom.edu").first():
        print("Database already contains both faculty accounts (Computer Networks & Blockchain Technology).")
        db.close()
        return


    print("Seeding database with multi-faculty course data...")

    # =========================================================================
    # 1. FACULTY 1: Dr. Rajesh Sharma (Computer Networks & AI)
    # =========================================================================
    faculty_user1 = models.User(
        email="faculty@smartclassroom.edu",
        username="prof.sharma",
        password_hash=hash_password("Faculty@1234"),
        role="FACULTY",
        full_name="Dr. Rajesh Sharma",
        avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        is_active=True
    )
    db.add(faculty_user1)
    db.flush()

    faculty_profile1 = models.Faculty(
        user_id=faculty_user1.id,
        department="Computer Science & Engineering",
        designation="Professor & Head of Department",
        employee_id="FAC-CSE-042",
        cabin_room="Academic Block B, Room 302",
        phone="+91 98765 43210"
    )
    db.add(faculty_profile1)
    db.flush()

    # Subjects for Faculty 1
    subj_cn = models.Subject(
        code="CS501",
        name="Computer Networks",
        department="Computer Science & Engineering",
        semester=5,
        faculty_id=faculty_profile1.id
    )
    subj_ai = models.Subject(
        code="CS601",
        name="Artificial Intelligence & Machine Learning",
        department="Computer Science & Engineering",
        semester=6,
        faculty_id=faculty_profile1.id
    )
    db.add(subj_cn)
    db.add(subj_ai)
    db.flush()

    # =========================================================================
    # 2. FACULTY 2: Prof. Vikram Verma (Blockchain Technology & Cyber Security)
    # =========================================================================
    faculty_user2 = models.User(
        email="blockchain.faculty@smartclassroom.edu",
        username="prof.verma",
        password_hash=hash_password("Faculty@1234"),
        role="FACULTY",
        full_name="Prof. Vikram Verma",
        avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        is_active=True
    )
    db.add(faculty_user2)
    db.flush()

    faculty_profile2 = models.Faculty(
        user_id=faculty_user2.id,
        department="Computer Science & Engineering",
        designation="Associate Professor",
        employee_id="FAC-CSE-088",
        cabin_room="Academic Block C, Room 104",
        phone="+91 98765 99881"
    )
    db.add(faculty_profile2)
    db.flush()

    # Subjects for Faculty 2
    subj_bc = models.Subject(
        code="CS702",
        name="Blockchain Technology & Distributed Ledgers",
        department="Computer Science & Engineering",
        semester=7,
        faculty_id=faculty_profile2.id
    )
    subj_sec = models.Subject(
        code="CS605",
        name="Cyber Security & Cryptography",
        department="Computer Science & Engineering",
        semester=6,
        faculty_id=faculty_profile2.id
    )
    db.add(subj_bc)
    db.add(subj_sec)
    db.flush()

    all_subjects = [subj_cn, subj_ai, subj_bc, subj_sec]

    # =========================================================================
    # 3. STUDENTS (Enrolled across courses)
    # =========================================================================
    students_data = [
        ("Alex Turner", "21CS101", "student@smartclassroom.edu", "Computer Science & Engineering", "3rd Year", "A", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80"),
        ("Alice Smith", "21CS001", "student1@smartclassroom.edu", "Computer Science & Engineering", "3rd Year", "A", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80"),
        ("Bob Johnson", "21CS002", "student2@smartclassroom.edu", "Computer Science & Engineering", "3rd Year", "A", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80"),
        ("Carol Williams", "21CS003", "student3@smartclassroom.edu", "Computer Science & Engineering", "3rd Year", "B", "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80"),
        ("David Miller", "21CS004", "student4@smartclassroom.edu", "Computer Science & Engineering", "3rd Year", "B", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"),
        ("Emma Davis", "21CS005", "student5@smartclassroom.edu", "Computer Science & Engineering", "3rd Year", "A", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80"),
    ]

    created_students = []
    for full_name, roll, email, dept, year, sec, avatar in students_data:
        u = models.User(
            email=email,
            username=roll.lower(),
            password_hash=hash_password("Student@1234"),
            role="STUDENT",
            full_name=full_name,
            avatar=avatar,
            is_active=True
        )
        db.add(u)
        db.flush()

        s = models.Student(
            user_id=u.id,
            roll_number=roll,
            department=dept,
            academic_year=year,
            section=sec,
            face_registered=False
        )
        db.add(s)
        db.flush()
        created_students.append(s)

        # Enroll student in all department subjects (Computer Networks, Blockchain, AI, Cyber Security)
        for subj in all_subjects:
            db.add(models.Enrollment(student_id=s.id, subject_id=subj.id))

    # =========================================================================
    # 4. PAST ATTENDANCE RECORDS (Past 7 Days)
    # =========================================================================
    today = date.today()
    for day_offset in range(1, 8):
        rec_date = (today - timedelta(days=day_offset)).isoformat()
        for idx, s in enumerate(created_students):
            for subj in [subj_cn, subj_bc]:
                status = "Present" if (idx + day_offset + subj.id) % 5 != 0 else "Absent"
                att = models.Attendance(
                    student_id=s.id,
                    subject_id=subj.id,
                    date=rec_date,
                    status=status,
                    confidence=0.94 if status == "Present" else 0.0,
                    method="AI_FACE" if status == "Present" else "MANUAL",
                    marked_by="AI Facial Attendance System",
                    timestamp=datetime.utcnow() - timedelta(days=day_offset)
                )
                db.add(att)

    # =========================================================================
    # 5. ASSIGNMENTS FOR COMPUTER NETWORKS & BLOCKCHAIN
    # =========================================================================
    # Dr. Rajesh Sharma - Computer Networks Assignment
    assign_cn = models.Assignment(
        title="Socket Programming & TCP Congestion Control Analysis",
        description="Implement a multi-threaded TCP Client-Server architecture in Python using socket library. Measure packet throughput and simulate sliding window flow control.",
        subject_id=subj_cn.id,
        faculty_id=faculty_profile1.id,
        recipient_type="ALL",
        max_marks=100,
        due_date=datetime.utcnow() + timedelta(days=5),
        created_at=datetime.utcnow() - timedelta(days=2)
    )
    db.add(assign_cn)

    # Prof. Vikram Verma - Blockchain Assignment
    assign_bc = models.Assignment(
        title="Ethereum Smart Contract Deployment & Gas Optimization",
        description="Write an ERC-20 token smart contract in Solidity with mint, burn, and transfer functionality. Include Hardhat tests and analyze gas consumption per transaction.",
        subject_id=subj_bc.id,
        faculty_id=faculty_profile2.id,
        recipient_type="ALL",
        max_marks=100,
        due_date=datetime.utcnow() + timedelta(days=7),
        created_at=datetime.utcnow() - timedelta(days=1)
    )
    db.add(assign_bc)
    db.flush()

    # Sample submission for Computer Networks from Alice Smith
    sub1 = models.Submission(
        assignment_id=assign_cn.id,
        student_id=created_students[1].id,
        file_name="TCP_Socket_Server_AliceSmith.py",
        comments="Implemented TCP multi-threaded echo server with packet loss simulation and RTT graphs.",
        submitted_at=datetime.utcnow() - timedelta(hours=6),
        marks_obtained=96.0,
        feedback="Exceptional socket handling and clear throughput analysis. Full marks awarded.",
        graded_at=datetime.utcnow() - timedelta(hours=2)
    )
    db.add(sub1)

    # =========================================================================
    # 6. ASSESSMENTS / QUIZZES FOR BOTH FACULTIES
    # =========================================================================
    # Quiz 1: Computer Networks (Dr. Rajesh Sharma)
    quiz_cn = models.Assessment(
        title="Mid-Term Assessment: Computer Networks & OSI Model",
        description="Multiple-choice examination covering OSI 7 layers, TCP/IP handshake, subnetting, and DNS resolution.",
        subject_id=subj_cn.id,
        faculty_id=faculty_profile1.id,
        duration_minutes=20,
        total_marks=20,
        is_published=True,
        due_date=datetime.utcnow() + timedelta(days=4)
    )
    db.add(quiz_cn)
    db.flush()

    cn_questions = [
        ("Which transport layer protocol provides reliable, connection-oriented byte stream delivery?", "UDP", "TCP", "ICMP", "ARP", "B", 5),
        ("In IPv4 addressing, what is the default subnet mask for a Class C network?", "255.0.0.0", "255.255.0.0", "255.255.255.0", "255.255.255.255", "C", 5),
        ("Which protocol resolves an IP address to a physical MAC address on a local area network?", "DNS", "DHCP", "ARP", "BGP", "C", 5),
        ("What is the primary role of the Three-Way Handshake in TCP?", "Encrypt payload data", "Establish synchronized sequence numbers", "Compress headers", "Determine routing hops", "B", 5)
    ]
    for q_text, op_a, op_b, op_c, op_d, corr, marks in cn_questions:
        db.add(models.Question(
            assessment_id=quiz_cn.id,
            question_text=q_text,
            option_a=op_a,
            option_b=op_b,
            option_c=op_c,
            option_d=op_d,
            correct_option=corr,
            marks=marks
        ))

    # Quiz 2: Blockchain Technology (Prof. Vikram Verma)
    quiz_bc = models.Assessment(
        title="Mid-Term Assessment: Blockchain Consensus & Smart Contracts",
        description="MCQ quiz testing cryptographic hashing, Proof of Work vs Proof of Stake, EVM bytecode, and Solidity syntax.",
        subject_id=subj_bc.id,
        faculty_id=faculty_profile2.id,
        duration_minutes=25,
        total_marks=20,
        is_published=True,
        due_date=datetime.utcnow() + timedelta(days=6)
    )
    db.add(quiz_bc)
    db.flush()

    bc_questions = [
        ("Which consensus mechanism relies on computational puzzle-solving to validate blocks?", "Proof of Stake (PoS)", "Proof of Work (PoW)", "Delegated PoS", "Proof of Authority", "B", 5),
        ("What data structure is used in Ethereum to verify transactions efficiently in a block header?", "Binary Search Tree", "Merkle Patricia Trie", "Red-Black Tree", "B+ Tree", "B", 5),
        ("In Solidity, which state visibility allows a function to be called ONLY by external transactions?", "public", "internal", "private", "external", "D", 5),
        ("What cryptographic hash function is standard in Bitcoin block hashing?", "SHA-256", "MD5", "Keccak-256", "BLAKE3", "A", 5)
    ]
    for q_text, op_a, op_b, op_c, op_d, corr, marks in bc_questions:
        db.add(models.Question(
            assessment_id=quiz_bc.id,
            question_text=q_text,
            option_a=op_a,
            option_b=op_b,
            option_c=op_c,
            option_d=op_d,
            correct_option=corr,
            marks=marks
        ))

    # =========================================================================
    # 7. STUDY MATERIALS FOR BOTH COURSES
    # =========================================================================
    materials = [
        ("Unit 01: Computer Networking Fundamentals & OSI Architecture", "Comprehensive lecture notes on physical, data link, and network layer framing.", subj_cn.id, faculty_profile1.id, "Lecture Notes", "cn_unit1_architecture.pdf", "3.4 MB"),
        ("Unit 03: TCP/IP Protocol Suite & Congestion Control", "Deep dive into TCP Reno, Tahoe, slow start, and window flow control.", subj_cn.id, faculty_profile1.id, "Lecture Notes", "tcp_congestion_control.pdf", "2.8 MB"),
        ("Module 01: Blockchain Architecture, Cryptography & Hashes", "Introduction to decentralized ledgers, public key cryptography, and Merkle trees.", subj_bc.id, faculty_profile2.id, "Lecture Notes", "blockchain_fundamentals.pdf", "4.2 MB"),
        ("Module 02: Solidity Smart Contract Security & Reentrancy", "Analysis of common smart contract vulnerabilities and reentrancy attack vectors.", subj_bc.id, faculty_profile2.id, "Reference Guide", "solidity_security_guide.pdf", "1.9 MB"),
    ]
    for title, desc, subj_id, fac_id, cat, fname, fsize in materials:
        db.add(models.StudyMaterial(
            title=title,
            description=desc,
            subject_id=subj_id,
            faculty_id=fac_id,
            file_url=f"/uploads/materials/{fname}",
            file_name=fname,
            file_size=fsize,
            category=cat
        ))

    # =========================================================================
    # 8. ANNOUNCEMENTS
    # =========================================================================
    db.add(models.Announcement(
        title="Computer Networks Lab: Packet Sniffer Setup (Wireshark)",
        content="Please install Wireshark on your lab workstations before Thursday's practical session.",
        faculty_id=faculty_profile1.id,
        subject_id=subj_cn.id,
        priority="HIGH"
    ))
    db.add(models.Announcement(
        title="Blockchain Workshop: Deploying Contracts on Sepolia Testnet",
        content="Join the hands-on workshop this Friday on MetaMask wallet configuration and faucet token acquisition.",
        faculty_id=faculty_profile2.id,
        subject_id=subj_bc.id,
        priority="NORMAL"
    ))

    # =========================================================================
    # 9. TODAY'S TASKS
    # =========================================================================
    tasks = [
        ("Complete Socket Programming Lab Exercise", "Run TCP server and measure round-trip times.", faculty_user1.id, created_students[0].id, "High", datetime.utcnow() + timedelta(days=2)),
        ("Review Blockchain Consensus Algorithms", "Read Proof of Stake vs Proof of Work comparison.", faculty_user2.id, created_students[0].id, "Medium", datetime.utcnow() + timedelta(days=3)),
        ("Register Student Face Profile on Smart Classroom", "Use webcam to capture face samples for automated attendance.", faculty_user1.id, None, "High", datetime.utcnow() + timedelta(days=1)),
    ]
    for title, desc, cby, asid, prio, due in tasks:
        db.add(models.Task(
            title=title,
            description=desc,
            created_by_user_id=cby,
            assigned_to_student_id=asid,
            priority=prio,
            due_date=due,
            is_completed=False
        ))

    # =========================================================================
    # 10. NOTIFICATIONS
    # =========================================================================
    demo_student_user = created_students[0].user
    db.add(models.Notification(
        user_id=demo_student_user.id,
        title="Enrolled in Computer Networks & Blockchain Technology",
        message="You are enrolled in CS501 (Computer Networks) by Dr. Rajesh Sharma and CS702 (Blockchain Technology) by Prof. Vikram Verma.",
        type="ANNOUNCEMENT",
        link="/dashboard"
    ))
    db.add(models.Notification(
        user_id=demo_student_user.id,
        title="New Assignment: Socket Programming",
        message="Dr. Rajesh Sharma published a new assignment due in 5 days.",
        type="ASSIGNMENT",
        link="/assignments"
    ))
    db.add(models.Notification(
        user_id=demo_student_user.id,
        title="New Assignment: Smart Contract Deployment",
        message="Prof. Vikram Verma published a new assignment due in 7 days.",
        type="ASSIGNMENT",
        link="/assignments"
    ))

    # Notifications for Dr. Sharma
    db.add(models.Notification(
        user_id=faculty_user1.id,
        title="Course Ready: Computer Networks (CS501)",
        message="Your course Computer Networks is active with 6 students enrolled.",
        type="ANNOUNCEMENT",
        link="/faculty/dashboard"
    ))

    # Notifications for Prof. Verma
    db.add(models.Notification(
        user_id=faculty_user2.id,
        title="Course Ready: Blockchain Technology (CS702)",
        message="Your course Blockchain Technology & Distributed Ledgers is active with 6 students enrolled.",
        type="ANNOUNCEMENT",
        link="/faculty/dashboard"
    ))

    db.commit()
    db.close()
    print("Database seeding completed successfully with multi-faculty courses!")


if __name__ == "__main__":
    force_flag = "--force" in sys.argv
    seed_database(force=force_flag)
