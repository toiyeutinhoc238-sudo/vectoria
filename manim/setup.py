from manim import *
import numpy as np
import colorsys

# Cấu hình chung
config.tex_template.add_to_preamble(r"\usepackage{xcolor}")

# Phông chữ và mẫu tiếng Việt
font_main = "Times New Roman"
vietnamese_template = TexTemplate()
vietnamese_template.add_to_preamble(r"\usepackage{vntex}")

# HÀM TẠO NỀN DÙNG CHUNG CHO CÁC SCENE GALAXY
def create_galaxy_background(scene_obj):
    scene_obj.camera.background_color = "#000000"
    stars = VGroup()
    for _ in range(200):
        x = np.random.uniform(-9, 9)
        y = np.random.uniform(-5, 5)
        opacity = np.random.uniform(0.1, 0.9)
        size = np.random.uniform(0.01, 0.05)
        star = Dot(point=[x, y, 0], radius=size, color=WHITE, fill_opacity=opacity)
        stars.add(star)
    
    nebula_1 = Dot(radius=4, color=PURPLE_E).set_opacity(0.15).move_to(UL*4)
    nebula_2 = Dot(radius=5, color=BLUE_E).set_opacity(0.15).move_to(DR*4)
    
    background = VGroup(stars, nebula_1, nebula_2)
    scene_obj.add(background)
    
    # Hiệu ứng trôi nền nhẹ
    scene_obj.play(
        background.animate.shift(LEFT * 0.2),
        run_time=3, rate_func=linear
    )
    return background
