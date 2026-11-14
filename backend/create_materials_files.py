import os
import json
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database import SessionLocal
import models

materials_dir = os.path.join(BASE_DIR, 'uploads', 'materials')
os.makedirs(materials_dir, exist_ok=True)

nb_path = os.path.join(materials_dir, 'deep_learning_pytorch_lab.ipynb')
nb_content = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# SMART CLASSROOM: Deep Learning PyTorch Lab\n",
                "## Convolutional Neural Networks & Optimization\n",
                "This notebook demonstrates CNN training, evaluation loss curves, and confusion matrix generation."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": 1,
            "metadata": {},
            "outputs": [],
            "source": [
                "import torch\n",
                "import torch.nn as nn\n",
                "print('PyTorch Version:', torch.__version__)\n",
                "print('Device:', 'cuda' if torch.cuda.is_available() else 'cpu')"
            ]
        }
    ],
    "metadata": {
        "language_info": {
            "name": "python"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 2
}

with open(nb_path, 'w', encoding='utf-8') as f:
    json.dump(nb_content, f, indent=2)

print(f"Jupyter Notebook saved: {nb_path}")

db = SessionLocal()
existing = db.query(models.StudyMaterial).filter(models.StudyMaterial.file_name == 'deep_learning_pytorch_lab.ipynb').first()
if not existing:
    first_subj = db.query(models.Subject).first()
    first_fac = db.query(models.Faculty).first()
    mat = models.StudyMaterial(
        title='Lab 04: PyTorch Deep Learning Hands-On Notebook',
        description='Interactive Jupyter Notebook (.ipynb) with convolutional architecture, forward pass, and training epochs.',
        subject_id=first_subj.id if first_subj else 1,
        faculty_id=first_fac.id if first_fac else 1,
        file_url='/uploads/materials/deep_learning_pytorch_lab.ipynb',
        file_name='deep_learning_pytorch_lab.ipynb',
        file_size='1.8 MB',
        category='Lecture Notes'
    )
    db.add(mat)
    db.commit()
    print("Added StudyMaterial record for .ipynb notebook!")
db.close()

