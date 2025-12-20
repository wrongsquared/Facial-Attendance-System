# export_to_onnx.py
import torch
from torchvision import models
import torch.nn as nn

IMG_SIZE = 112

model = models.efficientnet_b0(weights=None)
model.classifier[1] = nn.Linear(1280, 2)

state = torch.load("antispoof_best.pth", map_location="cpu")
model.load_state_dict(state)

model.eval()

dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE)

torch.onnx.export(
    model,
    dummy,
    "antispoof_best.onnx",
    input_names=["input"],
    output_names=["output"],
    opset_version=11,
    dynamic_axes={"input": {0: "batch"}}
)

print("✅ Exported antispoof_best.onnx (112x112)")
