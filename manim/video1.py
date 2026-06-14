from setup import *

# scene0 em edit bằng capcut nên Hà coi drive nha

class scene1(Scene):
    def construct(self):
        # phần 1
        scene1_group = Group()

        divider = Line(UP * 2.5, DOWN * 3, color=GREY_A)
        scene1_group.add(divider)
        self.play(Create(divider))

        scalar_title = Text("Đại lượng vô hướng", font=font_main, color=BLUE).shift(LEFT * 3.5 + UP * 3)
        vector_title = Text("Đại lượng có hướng", font=font_main, color=YELLOW).shift(RIGHT * 3.5 + UP * 3)
        scene1_group.add(scalar_title, vector_title)
        
        scalar_def = Text("Chỉ có độ lớn", font=font_main, font_size=24).next_to(scalar_title, DOWN)
        vector_def = Text("Độ lớn và hướng", font=font_main, font_size=24).next_to(vector_title, DOWN)
        scene1_group.add(scalar_def, vector_def)

        self.play(Write(scalar_title), Write(vector_title))
        self.play(FadeIn(scalar_def), FadeIn(vector_def))

        scalar_data = [
            [r"picture\5.png", "100$"],
            [r"picture\6.png", "10:00 AM"],
            [r"picture\7.png", "3 kg"]
        ]
        
        vector_data = [
            [r"picture\8.png", "chuyển tiền tới H"],
            [r"picture\9.png", "gió thổi hướng Nam"],
            [r"picture\10.png", "106 km/h"]
        ]

        for i in range(3):
            try:
                s_img = ImageMobject(scalar_data[i][0]).scale(0.7)
            except:
                s_img = Square(color=BLUE, fill_opacity=0.5).scale(0.5)

            s_txt = Text(scalar_data[i][1], font=font_main, font_size=28)
            s_item = Group(s_img, s_txt).arrange(RIGHT, buff=0.5)
            s_item.move_to(LEFT * 6 + UP * (1 - i * 1.6), aligned_edge=LEFT)
            
            scene1_group.add(s_item)
            self.play(FadeIn(s_item, shift=RIGHT), run_time=0.8)

        self.wait(0.5)

        for i in range(3):
            try:
                v_img = ImageMobject(vector_data[i][0]).scale(0.8)
            except:
                v_img = Square(color=YELLOW, fill_opacity=0.5).scale(0.5)
                
            v_txt = Text(vector_data[i][1], font=font_main, font_size=28)
            v_item = Group(v_img, v_txt).arrange(RIGHT, buff=0.5)
            v_item.move_to(RIGHT * 0.1 + UP * (1 - i * 1.6), aligned_edge=LEFT)

            scene1_group.add(v_item)
            self.play(FadeIn(v_item, shift=LEFT), run_time=0.8)

        self.wait(1)

        summary_text = Text(
            "Các đại lượng có hướng được gọi là Vector", 
            font=font_main, 
            font_size=30,
            color=WHITE,
            t2c={"Vector": RED}
        ).to_edge(DOWN, buff=0.4)

        self.play(Write(summary_text), run_time=2)
        self.wait(1)
        
        # phần 2
        title_vector = Text("Vector", font=font_main, font_size=48, color=RED).to_edge(UP).shift(RIGHT*0.2)
        
        self.play(
            ReplacementTransform(summary_text, title_vector),
            FadeOut(scene1_group),
            run_time=2
        )

        center_arrow = Arrow(LEFT * 3, RIGHT * 3, buff=0, color=YELLOW, stroke_width=6)
        
        dot_start = Dot(center_arrow.get_start(), color=BLUE)
        dot_end = Dot(center_arrow.get_end(), color=BLUE)
        
        label_start = Text("Điểm gốc", font=font_main, font_size=24).next_to(dot_start, DOWN)
        label_end = Text("Điểm ngọn", font=font_main, font_size=24).next_to(dot_end, DOWN)
        
        brace = Brace(center_arrow, UP)
        label_mag = Text("Độ lớn", font=font_main, font_size=24)
        label_mag.next_to(brace, UP, buff=0.1)
        
        label_dir = Text("Hướng", font=font_main, font_size=24, color=YELLOW).next_to(center_arrow.get_end(), RIGHT)

        self.play(GrowArrow(center_arrow))
        self.play(Create(dot_start), Write(label_start))
        self.play(Create(dot_end), Write(label_end))
        self.wait(2)
        self.play(GrowFromCenter(brace), Write(label_mag))
        self.play(Write(label_dir))
        
        self.wait(2)

        # phần 3
        self.play(
            FadeOut(dot_start), FadeOut(dot_end),
            FadeOut(label_start), FadeOut(label_end),
            FadeOut(brace), FadeOut(label_mag),
            FadeOut(label_dir),
            run_time=1
        )

        axes = Axes(
            x_range=[-4, 7, 1],  
            y_range=[-1, 7, 1],  
            x_length=10,          
            y_length=5.5,
            axis_config={"color": WHITE, "include_tip": True}, 
        )
        axis_labels = axes.get_axis_labels(x_label="x", y_label="y")

        
        r2_big_label = MathTex(r"\mathbb{R}^2", color=WHITE).scale(2.5)
        r2_big_label.to_corner(UL, buff=1).shift(DOWN*0.5) 

        x_val = 4
        y_val = 3
        origin_point = axes.c2p(0, 0)
        vector_end_point = axes.c2p(x_val, y_val)

        target_vector = Arrow(origin_point, vector_end_point, buff=0, color=YELLOW, stroke_width=4)

        self.play(
            Create(axes), 
            Write(axis_labels),
            Write(r2_big_label), 
            Transform(center_arrow, target_vector),
            run_time=2
        )
        
        self.play(Indicate(r2_big_label, scale_factor=1.1, color=BLUE_A))

        vector = center_arrow 

        line_x = DashedLine(vector_end_point, axes.c2p(x_val, 0), color=GREY)
        line_y = DashedLine(vector_end_point, axes.c2p(0, y_val), color=GREY)

        self.play(Create(line_x), Create(line_y))

        label_x_val = MathTex(r"x_v", color=YELLOW).next_to(axes.c2p(x_val, 0), DOWN)
        label_y_val = MathTex(r"y_v", color=YELLOW).next_to(axes.c2p(0, y_val), LEFT)

        vector_label = MathTex(
            r"\vec{v} = \begin{pmatrix} x_v \\ y_v \end{pmatrix}", 
            color=YELLOW
        )
        vector_label.next_to(vector_end_point, UP + RIGHT, buff=0.1)

        self.play(
            Write(label_x_val),
            Write(label_y_val),
            Write(vector_label)
        )
        self.wait(3)

class scene2(Scene):
    def construct(self):
        plane = NumberPlane(
            x_range=[-7, 7, 1],
            y_range=[-4, 4, 1],
            background_line_style={
                "stroke_color": BLUE_D,
                "stroke_width": 2,
                "stroke_opacity": 0.5
            }
        )
        # plane.add_coordinates()

        r2_big_label = MathTex(r"\mathbb{R}^2", color=WHITE)
        r2_big_label.scale(3)  
        r2_big_label.to_corner(UL, buff=1)

        vec = Vector(direction=[4, 2, 0], color=YELLOW)
        vec_label = MathTex(r"\vec{v}=\begin{pmatrix} 4 \\ 2 \end{pmatrix}", color=YELLOW).next_to(vec.get_end(), UR, buff=0.1)

        self.add(plane)

        self.add(r2_big_label)
        self.wait(0.5)

        self.play(GrowArrow(vec), run_time=1.5)
        self.play(Write(vec_label))
        self.wait(1)

        line_x = DashedLine(
            start=[4, 2, 0],
            end=[4, 0, 0],
            color=WHITE
        )
        line_y = DashedLine(
            start=[4, 2, 0],
            end=[0, 2, 0],
            color=WHITE
        )

        x_segment = Line(start=[0, 0, 0], end=[4, 0, 0], color=BLUE, stroke_width=6)
        y_segment = Line(start=[0, 0, 0], end=[0, 2, 0], color=RED, stroke_width=6)

        x_label = MathTex("4", color=BLUE).next_to(x_segment, DOWN, buff=0.1)
        y_label = MathTex("2", color=RED).next_to(y_segment, LEFT, buff=0.1)

        self.play(Create(line_x), Create(line_y))
        self.wait(0.5)

        self.play(
            Create(x_segment),
            Write(x_label),
            run_time=1.5
        )
        self.wait(0.5)

        self.play(
            Create(y_segment),
            Write(y_label),
            run_time=1.5
        )

        self.play(Indicate(x_label), Indicate(y_label))
        self.wait(2)

class scene3(Scene):
    def construct(self):
        plane = NumberPlane(
            x_range=[-7, 7, 1],
            y_range=[-4, 4, 1],
            background_line_style={
                "stroke_color": BLUE_D,
                "stroke_width": 2,
                "stroke_opacity": 0.5
            }
        )
        
        # plane.add_coordinates()

        vec = Vector(direction=[3, 2, 0], color=YELLOW)
        
        vec_label = MathTex(r"\vec{u}=\begin{pmatrix} 3 \\ 2 \end{pmatrix}", color=YELLOW).next_to(vec.get_end(), UR, buff=0.1)

        self.add(plane)
        self.wait(0.5)
        
        self.play(GrowArrow(vec), run_time=1.5)
        self.play(Write(vec_label))
        
        self.wait(2)

        new_vec = Vector(direction=[-3, 2, 0], color=BLUE)
        new_label = MathTex(r"\vec{v}=\begin{pmatrix} -3 \\ 2 \end{pmatrix}", color=BLUE).next_to(new_vec.get_end(), UL, buff=0.1)
        
        self.play(Transform(vec, new_vec), Transform(vec_label, new_label))
        self.wait(1)

        original_vec = Vector(direction=[3, 2, 0], color=YELLOW)
        original_label = MathTex(r"\vec{u}=\begin{pmatrix} 3 \\ 2 \end{pmatrix}", color=YELLOW).next_to(original_vec.get_end(), UR, buff=0.1)

        self.play(
            Transform(vec, original_vec),
            Transform(vec_label, original_label)
        )
        self.wait(1)

        self.play(FadeOut(vec_label))

        self.play(
            vec.animate.shift(RIGHT * 2 + DOWN * 1),
            run_time=2,
            rate_func=smooth
        )
        self.wait(1)

        self.play(
            vec.animate.shift(LEFT * 4 + UP * 0.5),
            run_time=2
        )
        self.wait(2)

class scene4(ThreeDScene):
    def construct(self):
        axes = ThreeDAxes(
            x_range=[-1, 6, 1],
            y_range=[-1, 6, 1],
            z_range=[-1, 5, 1],
            x_length=7,
            y_length=7,
            z_length=5,
        )#.add_coordinates()

        axes.shift(np.array([0, 0, -2.5]))

        labels = axes.get_axis_labels(
            Tex(r"x").scale(0.7), 
            Tex(r"y").scale(0.7), 
            Tex(r"z").scale(0.7)
        )

        self.set_camera_orientation(phi=75 * DEGREES, theta=30 * DEGREES)

        self.play(Create(axes), Write(labels))

        r3_label = MathTex(r"\mathbb{R}^3", color=WHITE).scale(3)
        r3_label.to_corner(UL, buff=1)
        
        self.add_fixed_in_frame_mobjects(r3_label)
        
        self.play(Write(r3_label))
        self.play(Indicate(r3_label, color=BLUE)) # Nhấn mạnh
        self.wait(0.5)

        coords = [4, 3, 3] 
        origin = axes.coords_to_point(0, 0, 0)
        end_point = axes.coords_to_point(*coords)
        
        point_xy = axes.coords_to_point(coords[0], coords[1], 0)
        point_x = axes.coords_to_point(coords[0], 0, 0)
        point_y = axes.coords_to_point(0, coords[1], 0)
        point_z = axes.coords_to_point(0, 0, coords[2])

        vector = Arrow3D(
            start=origin, 
            end=end_point, 
            color=YELLOW,
            resolution=8 
        )

        line_drop = DashedLine(end_point, point_xy, color=RED)
        line_to_x = DashedLine(point_xy, point_x, color=GREY)
        line_to_y = DashedLine(point_xy, point_y, color=GREY)
        line_to_z = DashedLine(end_point, point_z, color=GREY)

        self.play(Create(vector))
        self.play(
            Create(line_drop), 
            Create(line_to_x), 
            Create(line_to_y),
            Create(line_to_z)
        )

        label_vec = MathTex(r"\vec{v} = (x, y, z)", color=YELLOW).next_to(end_point, UP + RIGHT)
        self.add_fixed_orientation_mobjects(label_vec) 
        
        self.play(Write(label_vec))

        self.begin_ambient_camera_rotation(rate=0.2) 
        
        self.wait(6) 
        
        self.stop_ambient_camera_rotation()
        self.wait(1)

class scene5(ThreeDScene):
    def construct(self):
        
        axes = ThreeDAxes(
            x_range=[-4, 4, 1],
            y_range=[-4, 4, 1],
            z_range=[-4, 4, 1],
            axis_config={"include_tip": True}
        )

        labels = axes.get_axis_labels(
            x_label="x", 
            y_label="y", 
            z_label="z"
        )
        
        point = [3, 3, 2] 

        r3_label = MathTex(r"\mathbb{R}^3", color=WHITE).scale(3)
        r3_label.to_corner(UR, buff=1) 
        self.add_fixed_in_frame_mobjects(r3_label)

        vec_label = MathTex(
            r"\vec{v} = \begin{pmatrix} "
            r"\color{blue}{3} \\ "
            r"\color{green}{3} \\ "
            r"\color{red}{2} "
            r"\end{pmatrix}",
            font_size=42
        )
        vec_label.to_corner(UL, buff=0.5)
        self.add_fixed_in_frame_mobjects(vec_label)


        line_x = DashedLine(start=[0, 0, 0], end=[3, 0, 0], color=BLUE_B, stroke_width=6)
        line_y = DashedLine(start=[3, 0, 0], end=[3, 3, 0], color=GREEN, stroke_width=6)
        line_z = DashedLine(start=[3, 3, 0], end=[3, 3, 2], color=RED, stroke_width=6)
        
        vec_3d = Vector(direction=point, color=YELLOW)


        self.set_camera_orientation(phi=75 * DEGREES, theta=-45 * DEGREES)
        
        self.play(Create(axes), Write(labels))
        self.play(Write(r3_label)) 
        self.play(Indicate(r3_label, color=BLUE)) 
        self.wait(0.5)

        self.play(Write(vec_label))

        self.play(Indicate(vec_label[0][3], color=BLUE)) 
        self.move_camera(phi=65 * DEGREES, theta=-20 * DEGREES, run_time=1.5)
        self.play(Create(line_x))
        self.wait(0.5)

        self.play(Indicate(vec_label[0][4], color=GREEN)) # Sửa idx 
        self.move_camera(phi=45 * DEGREES, theta=-60 * DEGREES, run_time=2)
        self.play(Create(line_y))
        self.wait(0.5)

        self.play(Indicate(vec_label[0][5], color=RED)) 
        self.move_camera(phi=85 * DEGREES, theta=-30 * DEGREES, run_time=2)
        self.play(Create(line_z))
        self.wait(1)

        self.play(GrowArrow(vec_3d), run_time=2)
        self.play(Indicate(vec_3d))
        self.wait(1)

        self.set_camera_orientation(distance=10) 
        self.move_camera(phi=0 * DEGREES, theta=-90 * DEGREES, run_time=3) 
        self.wait(1)
        self.move_camera(phi=75 * DEGREES, theta=60 * DEGREES, run_time=3) 
        
        self.begin_ambient_camera_rotation(rate=0.1)
        self.wait(4)

class scene6(ThreeDScene):
    def construct(self):
        
        label_R = MathTex(r"\mathbb{R}^1", font_size=72).to_corner(UL, buff=1)
        self.add_fixed_in_frame_mobjects(label_R)

        label_vec = MathTex(
            r"\vec{v} = \begin{bmatrix} x_1 \end{bmatrix}", 
            font_size=48
        ).to_corner(UR, buff=1).shift(DOWN*1)
        self.add_fixed_in_frame_mobjects(label_vec)

        
        # GIAI ĐOẠN 1: R^1 (1 CHIỀU)
        
        number_line = NumberLine(
            x_range=[-4, 4, 1], length=8, include_tip=True, include_numbers=True, color=WHITE
        )
        vec_1d = Arrow(number_line.n2p(0), number_line.n2p(3), buff=0, color=YELLOW, stroke_width=6)
        
        self.play(Create(number_line), GrowArrow(vec_1d))
        self.play(Write(label_R), Write(label_vec))
        self.wait(1)

        # GIAI ĐOẠN 2: R^2 
        
        self.play(FadeOut(label_vec), run_time=0.5)

        target_R2 = MathTex(r"\mathbb{R}^2", font_size=72).to_corner(UL, buff=1)
        
        axes_2d = Axes(
            x_range=[-4, 4, 1], y_range=[-3, 3, 1], x_length=8, y_length=6,
            axis_config={"include_tip": True}
        )
        vec_2d = Arrow(axes_2d.c2p(0,0), axes_2d.c2p(3, 2), buff=0, color=YELLOW, stroke_width=6)

        self.play(
            Transform(label_R, target_R2), 
            ReplacementTransform(number_line, axes_2d), 
            ReplacementTransform(vec_1d, vec_2d),       
            run_time=2
        )
        
        label_vec_R2 = MathTex(
            r"\vec{v} = \begin{bmatrix} x_1 \\ x_2 \end{bmatrix}", 
            font_size=48
        ).to_corner(UR, buff=1).shift(DOWN*1)
        
        self.add_fixed_in_frame_mobjects(label_vec_R2)
        self.play(Write(label_vec_R2))
        self.wait(1)

        label_vec = label_vec_R2

        # GIAI ĐOẠN 3: R^3 
        
        self.play(FadeOut(label_vec), run_time=0.5)

        target_R3 = MathTex(r"\mathbb{R}^3", font_size=72).to_corner(UL, buff=1)
        
        axes_3d = ThreeDAxes(x_range=[-4,4], y_range=[-4,4], z_range=[-3,3], x_length=8, y_length=8, z_length=6)
        vec_3d = Arrow3D(
            start=axes_3d.coords_to_point(0,0,0), 
            end=axes_3d.coords_to_point(3,2,2), 
            color=YELLOW
        )

        self.move_camera(phi=75*DEGREES, theta=30*DEGREES, run_time=2)
        
        self.play(
            Transform(label_R, target_R3),
            ReplacementTransform(axes_2d, axes_3d),
            ReplacementTransform(vec_2d, vec_3d),
            run_time=2
        )
        
        label_vec_R3 = MathTex(
            r"\vec{v} = \begin{bmatrix} x_1 \\ x_2 \\ x_3 \end{bmatrix}", 
            font_size=48
        ).to_corner(UR, buff=1).shift(DOWN*1)
        
        self.add_fixed_in_frame_mobjects(label_vec_R3)
        self.play(Write(label_vec_R3))
        
        self.begin_ambient_camera_rotation(rate=0.2)
        self.wait(2)
        self.stop_ambient_camera_rotation()

        label_vec = label_vec_R3

        # GIAI ĐOẠN 4: R^n (N CHIỀU)
        
        self.play(FadeOut(label_vec), run_time=0.5)

        target_Rn = MathTex(r"\mathbb{R}^n", font_size=72).to_corner(UL, buff=1)
        
        self.move_camera(phi=0, theta=-90*DEGREES, run_time=1.5)
        
        self.play(
            FadeOut(axes_3d),
            FadeOut(vec_3d),
            Transform(label_R, target_Rn), 
            run_time=1.5
        )

        label_vec_Rn = MathTex(
            r"\vec{v} = \begin{bmatrix} x_1 \\ x_2 \\ \vdots \\ x_n \end{bmatrix}", 
            font_size=54
        ).move_to(ORIGIN)
        
        self.add_fixed_in_frame_mobjects(label_vec_Rn)
        self.play(Write(label_vec_Rn))
        
        self.play(Indicate(label_R, color=RED), Indicate(label_vec_Rn, color=YELLOW))
        self.wait(3)

class scene7(Scene):
    def construct(self):
        plane = Axes(
            x_range=[0, 12, 1],
            y_range=[0, 7, 1],
            x_length=12, 
            y_length=7, 
            axis_config={
                "color": WHITE,             # Màu trục là trắng
                "include_numbers": True,    # Nếu muốn hiện số trên trục 
                "include_tip": True         # Hiện mũi tên ở đầu trục
            }
        )
        plane.to_edge(DL)

        title = Text("Quy tắc nối đuôi", font=font_main, font_size=40, color=BLUE_B).to_edge(UP)
        self.play(Create(plane), Write(title))
        self.wait(1)
        
        # Vector U (Vàng) đi từ (0,0) -> (3,1)
        p_origin = plane.c2p(0,0)
        p_u = plane.c2p(3,1)
        u_vec = Arrow(start=p_origin, end=p_u, buff=0, color=YELLOW, stroke_width=6)
        
        # Ma trận U
        u_mat = Matrix([[3], [1]], v_buff=0.7, h_buff=0.8).scale(0.8).set_color(YELLOW)
        u_text = MathTex(r"\vec{u} =", color=YELLOW).scale(0.8)
        u_label = VGroup(u_text, u_mat).arrange(RIGHT, buff=0.1).next_to(u_vec, UR, buff=0.3).shift(DOWN*0.5)

        # Vector V (Xanh) - Ban đầu nằm tại gốc (0,0) -> (1,3)
        p_v = plane.c2p(1,3)
        v_vec = Arrow(start=p_origin, end=p_v, buff=0, color=BLUE, stroke_width=6)
        
        v_mat = Matrix([[1], [3]], v_buff=0.7, h_buff=0.8).scale(0.8).set_color(BLUE)
        v_text = MathTex(r"\vec{v} =", color=BLUE).scale(0.8)
        v_label = VGroup(v_text, v_mat).arrange(RIGHT, buff=0.1).next_to(v_vec, UP, buff=0.5).shift(RIGHT*0.4)
        
        # Hiện hình
        self.play(GrowArrow(u_vec), Write(u_label))
        self.play(GrowArrow(v_vec), Write(v_label))
        self.wait(1)

        # Vector V dịch chuyển: Điểm đầu dời đến ngọn U, Điểm cuối dời theo tương ứng
        # Tính toán điểm đích cuối cùng: (3+1, 1+3) = (4, 4)
        p_sum = plane.c2p(4,4)
        
        # Tạo vector bóng ma để di chuyển
        v_shifted = Arrow(start=p_u, end=p_sum, buff=0, color=BLUE, stroke_width=6)
        
        self.play(
            Transform(v_vec, v_shifted), # Biến hình v gốc thành v đã dịch chuyển
            run_time=2.5
        )

        # 4. VECTOR TỔNG (Đỏ) đi từ gốc (0,0) -> (4,4)
        sum_vec = Arrow(start=p_origin, end=p_sum, buff=0, color=RED, stroke_width=6)
        self.play(GrowArrow(sum_vec))
        
        # Ma trận kết quả
        w_mat = Matrix([[4], [4]], v_buff=0.7, h_buff=0.8).scale(0.8).set_color(RED)
        w_text = MathTex(r"\vec{w} =", color=RED).scale(0.8)
        w_label = VGroup(w_text, w_mat).arrange(RIGHT, buff=0.1).next_to(sum_vec.get_end(), RIGHT, buff=0.2)

        self.play(Write(w_text), Write(w_mat.get_brackets()))

        # Bay số
        u_entries = u_mat.get_entries()
        v_entries = v_mat.get_entries()
        w_entries = w_mat.get_entries()

        # Hàng trên (3 + 1)
        fly_u1 = u_entries[0].copy()
        fly_v1 = v_entries[0].copy()
        self.play(
            Transform(fly_u1, w_entries[0]),
            Transform(fly_v1, w_entries[0]),
            run_time=2.5
        )
        self.add(w_entries[0])
        self.remove(fly_u1, fly_v1)

        # Hàng dưới (1 + 3)
        fly_u2 = u_entries[1].copy()
        fly_v2 = v_entries[1].copy()
        self.play(
            Transform(fly_u2, w_entries[1]),
            Transform(fly_v2, w_entries[1]),
            run_time=2.5
        )
        self.add(w_entries[1])
        self.remove(fly_u2, fly_v2)

        self.play(Indicate(w_label))
        self.wait(3)

class scene8(Scene):
    def construct(self):

        plane = Axes(
            x_range=[0, 12, 1],
            y_range=[0, 8, 1],
            x_length=12, 
            y_length=8, 
            axis_config={
                "color": WHITE,             
                "include_numbers": True,    
                "include_tip": True         
            }
        )
        plane.to_edge(DL)
        
        title = Text("Quy tắc hình bình hành", font=font_main, font_size=36).to_edge(UP)
        self.play(Create(plane), Write(title))
        self.wait(1)

        p_origin = plane.c2p(0,0)
        p_u = plane.c2p(3,1)
        p_v = plane.c2p(1,3)
        p_sum = plane.c2p(4,4) # Điểm đích 

        # Vector U (Vàng)
        u_vec = Arrow(start=p_origin, end=p_u, buff=0, color=YELLOW, stroke_width=6)
        u_mat = Matrix([[3], [1]], v_buff=0.7, h_buff=0.8).scale(0.8).set_color(YELLOW)
        u_text = MathTex(r"\vec{u} =", color=YELLOW).scale(0.8)
        u_label = VGroup(u_text, u_mat).arrange(RIGHT, buff=0.1).next_to(u_vec, UR, buff=0.3).shift(DOWN*0.5)

        # Vector V (Xanh)
        v_vec = Arrow(start=p_origin, end=p_v, buff=0, color=BLUE, stroke_width=6)
        v_mat = Matrix([[1], [3]], v_buff=0.7, h_buff=0.8).scale(0.8).set_color(BLUE)
        v_text = MathTex(r"\vec{v} =", color=BLUE).scale(0.8)
        v_label = VGroup(v_text, v_mat).arrange(RIGHT, buff=0.1).next_to(v_vec, UP, buff=0.5).shift(RIGHT*0.4)
        
        # Hiện hình
        self.play(GrowArrow(u_vec), Write(u_label))
        self.play(GrowArrow(v_vec), Write(v_label))
        self.wait(1)

        # Đường đứt song song với V (xuất phát từ ngọn U)
        dashed_v = DashedLine(start=p_u, end=p_sum, color=BLUE)
        
        # Đường đứt song song với U (xuất phát từ ngọn V)
        dashed_u = DashedLine(start=p_v, end=p_sum, color=YELLOW)

        self.play(
            Create(dashed_v), 
            Create(dashed_u),
            run_time=2
        )
        self.wait(0.5)

        sum_vec = Arrow(start=p_origin, end=p_sum, buff=0, color=RED, stroke_width=6)
        
        sum_vec.set_z_index(10) 
        
        self.play(GrowArrow(sum_vec))

        
        # Ma trận kết quả
        w_mat = Matrix([[4], [4]], v_buff=0.7, h_buff=0.8).scale(0.8).set_color(RED)
        w_text = MathTex(r"\vec{w} =", color=RED).scale(0.8)
        w_label = VGroup(w_text, w_mat).arrange(RIGHT, buff=0.1).next_to(sum_vec.get_end(), RIGHT, buff=0.2)

        self.play(Write(w_text), Write(w_mat.get_brackets()))

        # Bay số
        u_entries = u_mat.get_entries()
        v_entries = v_mat.get_entries()
        w_entries = w_mat.get_entries()

        # Hàng trên (3 + 1 -> 4)
        fly_u1 = u_entries[0].copy()
        fly_v1 = v_entries[0].copy()
        self.play(
            Transform(fly_u1, w_entries[0]),
            Transform(fly_v1, w_entries[0]),
            run_time=2.0
        )
        self.add(w_entries[0])
        self.remove(fly_u1, fly_v1)

        # Hàng dưới (1 + 3 -> 4)
        fly_u2 = u_entries[1].copy()
        fly_v2 = v_entries[1].copy()
        self.play(
            Transform(fly_u2, w_entries[1]),
            Transform(fly_v2, w_entries[1]),
            run_time=2.0
        )
        self.add(w_entries[1])
        self.remove(fly_u2, fly_v2)

        self.play(Indicate(w_label))
        self.wait(3)

class scene9(Scene):
    def construct(self):
        
        plane = Axes(
            x_range=[-4, 10, 1], 
            y_range=[-3, 7, 1],  
            x_length=14, 
            y_length=10,        
            axis_config={
                "color": WHITE,             
                "include_tip": True,        
                "include_numbers": True     
            }
        )
        
        plane.to_edge(DL, buff=0.5)
        
        title = Text("Phép nhân Vector với số thực", font=font_main, font_size=36, color=BLUE_B).to_edge(UP).shift(RIGHT*1)
        
        self.play(Create(plane), Write(title))
        self.wait(1)

        u_x, u_y = 2, 1
        p_origin = plane.c2p(0,0)
        p_u = plane.c2p(u_x, u_y)

        k_tracker = ValueTracker(1.0)

        k_label = Text("k = ", font=font_main, font_size=40, color=WHITE).to_corner(UL)
        k_number = DecimalNumber(1.0, num_decimal_places=1, color=YELLOW).next_to(k_label, RIGHT)
        k_number.add_updater(lambda d: d.set_value(k_tracker.get_value()))

        self.play(Write(k_label), Write(k_number))

        u_vec = Arrow(start=p_origin, end=p_u, buff=0, color=YELLOW, stroke_width=4, stroke_opacity=0.3)
        
        u_mat = Matrix([[u_x], [u_y]], v_buff=0.6, h_buff=0.7).scale(0.7).set_color(YELLOW)
        u_text = MathTex(r"\vec{u} =", color=YELLOW).scale(0.7)
        
        u_label_group = VGroup(u_text, u_mat).arrange(RIGHT, buff=0.1)
        u_label_group.next_to(p_u, RIGHT, buff=0.2).shift(DOWN*0.2 + LEFT*0.1) # Tinh chỉnh vị trí

        self.play(GrowArrow(u_vec), Write(u_label_group))
        self.wait(0.5)

        def get_scaled_vector():
            k = k_tracker.get_value()
            p_end = plane.c2p(k * u_x, k * u_y)
            # Vector V đè lên U, màu đỏ, nét đậm hơn
            return Arrow(start=p_origin, end=p_end, buff=0, color=RED, stroke_width=6)

        v_vec = always_redraw(get_scaled_vector)
        
        v_label_text = always_redraw(
            lambda: MathTex(r"\vec{v}", color=RED).next_to(v_vec.get_end(), UP, buff=0.2)
        )

        self.play(GrowArrow(v_vec), FadeIn(v_label_text))

        eq_part1 = MathTex(r"\vec{v} = k \cdot \vec{u} =", color=RED).next_to(k_label, DOWN, buff=0.4, aligned_edge=LEFT).shift(LEFT*0.2)
        
        def get_result_matrix():
            k = k_tracker.get_value()
            val_x = k * u_x
            val_y = k * u_y
            mat = Matrix([[f"{val_x:.1f}"], [f"{val_y:.1f}"]], v_buff=0.6, h_buff=0.7).scale(0.8).set_color(RED)
            return mat

        result_matrix = always_redraw(get_result_matrix)
        result_matrix.next_to(eq_part1, RIGHT)
        result_matrix.add_updater(lambda m: m.next_to(eq_part1, RIGHT))

        self.play(Write(eq_part1), FadeIn(result_matrix))
        self.wait(1)

        self.play(
            k_tracker.animate.set_value(3.0),
            run_time=3,
            rate_func=linear
        )
        self.wait(0.5)

        self.play(
            k_tracker.animate.set_value(0.5),
            run_time=3,
            rate_func=smooth
        )
        self.wait(0.5)

        self.play(
            k_tracker.animate.set_value(-2.0),
            run_time=2.5,
            rate_func=smooth
        )
        self.wait(3)
