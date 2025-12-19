# export_to_onnx.py
import torch
from antispoof_model import AntiSpoofModel

model = AntiSpoofModel(pretrained=False)
model.load_state_dict(torch.load("antispoof_best.pth", map_location="cpu"))
model.eval()

dummy = torch.randn(1,3,224,224)

torch.onnx.export(
    model,
    dummy,
    "antispoof_custom.onnx",
    input_names=["input"],
    output_names=["output"],
    opset_version=11
)

print("Exported antispoof_custom.onnx")
