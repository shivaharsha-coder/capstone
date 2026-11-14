import sys
from datetime import datetime, timedelta
import models
from database import engine, SessionLocal

# Ensure tables are created
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

try:
    count = db.query(models.ClassSessionVideo).count()
    print(f"Current ClassSessionVideo count: {count}")
    if count == 0:
        sample_videos = [
            models.ClassSessionVideo(
                title="Lecture 14: Socket Programming & TCP Congestion Control",
                classroom_name="Smart Classroom 401",
                subject_code="CS501",
                faculty_name="Dr. Ramu V",
                video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                thumbnail_url="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60",
                duration="52 mins",
                file_size="245 MB",
                distractions_flagged=3,
                mobile_alerts_flagged=2,
                recorded_at=datetime.utcnow() - timedelta(hours=2)
            ),
            models.ClassSessionVideo(
                title="Lecture 09: Convolutional Neural Networks & Vision Transformers",
                classroom_name="Smart Classroom 302",
                subject_code="CS602",
                faculty_name="Dr. Ananya Sharma",
                video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                thumbnail_url="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=60",
                duration="48 mins",
                file_size="198 MB",
                distractions_flagged=1,
                mobile_alerts_flagged=0,
                recorded_at=datetime.utcnow() - timedelta(days=1, hours=3)
            ),
            models.ClassSessionVideo(
                title="Lecture 21: Distributed Systems, Consensus & Raft Protocol",
                classroom_name="Central Auditorium",
                subject_code="CS701",
                faculty_name="Prof. Rajesh K",
                video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                thumbnail_url="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=60",
                duration="60 mins",
                file_size="310 MB",
                distractions_flagged=4,
                mobile_alerts_flagged=1,
                recorded_at=datetime.utcnow() - timedelta(days=2, hours=1)
            ),
            models.ClassSessionVideo(
                title="Lecture 05: Cryptography & Public Key Infrastructure (PKI)",
                classroom_name="Cyber Lab 102",
                subject_code="CS503",
                faculty_name="Dr. Ramu V",
                video_url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
                thumbnail_url="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&auto=format&fit=crop&q=60",
                duration="45 mins",
                file_size="185 MB",
                distractions_flagged=0,
                mobile_alerts_flagged=0,
                recorded_at=datetime.utcnow() - timedelta(days=3, hours=5)
            )
        ]
        db.add_all(sample_videos)
        db.commit()
        print("Seeded 4 sample class session videos.")
    else:
        print("ClassSessionVideo table already has records.")
finally:
    db.close()

