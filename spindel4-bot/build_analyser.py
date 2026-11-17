"""Builds analyse.html: the analysis page with the robot's engine copied in.

Run this after changing the engine in spindel4-robot.user.js:
    python build_analyser.py
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, "spindel4-robot.user.js"), encoding="utf-8").read()
engine = src[src.index("// ENGINE-START"):src.index("// ENGINE-END")]
page = open(os.path.join(HERE, "analyse.template.html"), encoding="utf-8").read()
assert "/*__ENGINE__*/" in page
with open(os.path.join(HERE, "analyse.html"), "w", encoding="utf-8") as f:
    f.write(page.replace("/*__ENGINE__*/", engine))
print("analyse.html written")
