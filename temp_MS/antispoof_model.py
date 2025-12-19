# antispoof_model.py
import torch
import torch.nn as nn
from torchvision import models

class AntiSpoofModel(nn.Module):
    def __init__(self, pretrained=True, num_classes=2):
        super().__init__()

        base = models.mobilenet_v2(pretrained=pretrained)

        self.features = base.features
        self.classifier = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(1280, 512),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(512, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = nn.functional.adaptive_avg_pool2d(x, (1, 1))
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x
