# antispoof_model.py
import torch
import torch.nn as nn
from torchvision import models

class AntiSpoofModel(nn.Module):
    def __init__(self):
        super().__init__()
        base = models.mobilenet_v2(weights="IMAGENET1K_V1")
        self.features = base.features
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.classifier = nn.Linear(1280, 2)

    def forward(self, x):
        x = self.features(x)
        x = self.pool(x).view(x.size(0), -1)
        return self.classifier(x)