const searchDatabase = [
  // ==============================================
  // CHỦ ĐỀ: KHÔNG GIAN VECTOR VÀ KHÔNG GIAN CON
  // ==============================================
  {
    topic: "CHỦ ĐỀ: KHÔNG GIAN VECTOR",
    section: "Mục 1: Không gian vector",
    subsection: "1.1 Định nghĩa về không gian vector",
    content:
      "Cho 1 tập hợp \\( V \\neq \\varnothing \\) và một trường số \\( \\mathbb{K} \\) (ở đây chỉ xét \\( \\mathbb{K} = \\mathbb{R} \\)). Trong \\( V \\) xác định hai phép toán dưới dạng ánh xạ: Phép cộng hai vector \\( V \\times V \\longrightarrow V \\) và Phép nhân vector với vô hướng \\( \\mathbb{K} \\times V \\longrightarrow V \\). Khi đó, \\( V \\) lập thành một không gian vector nếu thỏa mãn 8 tiên đề gồm: tính giao hoán, tính kết hợp, phần tử trung hòa \\( 0_V \\), phần tử đối \\( -v \\), tính phân phối và phần tử đơn vị \\( 1 \\cdot u = u \\).",
    url: "topics/vector_space.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: KHÔNG GIAN VECTOR",
    section: "Mục 1: Không gian vector",
    subsection: "1.2 Các không gian vector phổ biến",
    content:
      "Các không gian vector thường gặp bao gồm: \\( \\mathbb{R}^n \\) (Không gian thực \\( n \\) chiều), \\( C(-\\infty, \\infty) \\) (Tập hợp các hàm số liên tục), \\( P_n \\) (Tập hợp các đa thức bậc không vượt quá \\( n \\)), và \\( \\mathcal{M}_{m,n}(\\mathbb{R}) \\) (Tập hợp tất cả các ma trận thực cỡ \\( m \\times n \\)). Nhận xét: Không gian vector \\( V \\) có thể là bất cứ tập hợp nào thỏa mãn 2 phép toán và 8 tiên đề ràng buộc.",
    url: "topics/vector_space.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: KHÔNG GIAN VECTOR",
    section: "Mục 1: Không gian vector",
    subsection: "Ví dụ: Chứng minh Không gian vector",
    content:
      "Ví dụ: Chứng minh \\( V \\equiv \\mathbb{R}^2 \\) là một không gian vector. Lời giải: Ta kiểm tra 8 tiên đề với \\( u = (x_1, x_2), v = (y_1, y_2) \\) và vô hướng \\( \\alpha, \\beta \\). Tập hợp thỏa mãn tính giao hoán, kết hợp, có phần tử trung hòa \\( 0_V = (0, 0) \\), phần tử đối \\( -u = (-x_1, -x_2) \\), tính phân phối và phần tử đơn vị. Kết luận \\( V = \\mathbb{R}^2 \\) là một không gian vector.",
    url: "topics/vector_space.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: KHÔNG GIAN VECTOR",
    section: "Mục 2: Không gian vector con",
    subsection: "2.1 Định nghĩa",
    content:
      "Một tập con \\( W \\) của một không gian vector \\( V \\) được gọi là một không gian con của \\( V \\) nếu \\( W \\) thỏa mãn 3 điều kiện: 1. \\( W \\neq \\varnothing \\) (Tập con khác rỗng). 2. Đóng kín với phép cộng: \\( \\forall u, v \\in W \\Rightarrow u + v \\in W \\). 3. Đóng kín với phép nhân vô hướng: \\( \\forall u \\in W, \\forall \\alpha \\in \\mathbb{K} \\Rightarrow \\alpha u \\in W \\).",
    url: "topics/vector_space.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: KHÔNG GIAN VECTOR",
    section: "Mục 2: Không gian vector con",
    subsection: "2.2 Kiểm tra không gian vector con",
    content:
      "Để kiểm tra xem \\( W \\) có là không gian con của \\( V \\) hay không, ta kiểm tra 3 mệnh đề: 1. Cả \\( W \\) và \\( V \\) phải có cùng vector 0. 2. \\( u + v \\) phải thuộc \\( W \\). 3. \\( k \\cdot u \\) phải thuộc \\( W \\). Nhận xét: Một tập con trong \\( \\mathbb{R}^n \\) định nghĩa bởi các phương trình sẽ là không gian con nếu tất cả các phương trình đó là bậc nhất và thuần nhất (vế phải bằng 0).",
    url: "topics/vector_space.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: KHÔNG GIAN VECTOR",
    section: "Mục 2: Không gian vector con",
    subsection: "Ví dụ: Tập thỏa mãn Không gian con",
    content:
      "Xét tập \\( W = \\{(x, y, z) \\in \\mathbb{R}^3 \\mid x - 2y + z = 0\\} \\). 1. Chứa vector không \\( 0_{\\mathbb{R}^3} = (0, 0, 0) \\) vì \\( 0 - 2(0) + 0 = 0 \\). 2. Đóng kín phép cộng: xét tổng \\( u + v \\), ta có \\( (x_1 + x_2) - 2(y_1 + y_2) + (z_1 + z_2) = 0 \\). 3. Đóng kín phép nhân vô hướng: \\( kx_1 - 2(ky_1) + kz_1 = 0 \\). Vậy \\( W \\) là không gian vector con của \\( \\mathbb{R}^3 \\).",
    url: "topics/vector_space.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: KHÔNG GIAN VECTOR",
    section: "Mục 2: Không gian vector con",
    subsection: "Ví dụ: Tập không thỏa mãn Không gian con",
    content:
      "Kiểm tra tập \\( W = \\{(x_1, x_2, x_3) \\in \\mathbb{R}^3 \\mid x_3 = x_1 x_2\\} \\). Tập này chứa vector không. Tuy nhiên khi xét tổng \\( u + v \\), thành phần thứ 3 là \\( (x_1 + y_1)(x_2 + y_2) = x_1 x_2 + x_1 y_2 + x_2 y_1 + y_1 y_2 \\neq x_3 + y_3 \\). Vi phạm điều kiện đóng kín với phép cộng nên \\( W \\) KHÔNG là không gian vector con.",
    url: "topics/vector_space.html#ly-thuyet",
  },

  // ==============================================
  // CHỦ ĐỀ: ĐỊNH THỨC
  // ==============================================
  {
    topic: "CHỦ ĐỀ: ĐỊNH THỨC",
    section: "Mục 1: Định nghĩa",
    subsection: "Định nghĩa định thức",
    content:
      "Với mỗi ma trận vuông \\( A \\) cấp \\( n \\), tồn tại một số thực được gọi là định thức của ma trận \\( A \\), được ký hiệu là \\( det(A) \\) hay \\( |A| \\).",
    url: "topics/sub_topic/dinh_thuc.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: ĐỊNH THỨC",
    section: "Mục 2: Định thức cấp 2",
    subsection: "Tính định thức cấp 2",
    content:
      "Cho \\( A \\) là ma trận vuông cấp 2, định thức (cấp 2) của \\( A \\) được xác định như sau: \\( detA = a_{11}a_{22} - a_{12}a_{21} \\). Nhận xét: Định thức cấp 2 được tính bằng cách lấy đường chéo chính trừ đường chéo phụ. Được dùng để xác định tích có hướng của hai vector, diện tích hình bình hành và diện tích tam giác.",
    url: "topics/sub_topic/dinh_thuc.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: ĐỊNH THỨC",
    section: "Mục 3: Định thức cấp 3",
    subsection: "Quy tắc Sarrus",
    content:
      "Định thức (cấp 3) của \\( A \\) được tính theo công thức khai triển hoặc dùng quy tắc Sarrus (ghi nhớ bằng cách thêm 2 cột vào sau định thức). Nhận xét: Định thức cấp 3 được dùng để xác định tích hỗn tạp của ba vector, thể tích hình hộp (xiên) và thể tích khối tứ diện.",
    url: "topics/sub_topic/dinh_thuc.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: ĐỊNH THỨC",
    section: "Mục 4: Định thức cấp n",
    subsection: "Phần bù đại số",
    content:
      "Phần bù đại số của \\( a_{ij} \\), được ký hiệu là \\( A_{ij} \\) và được xác định bởi: \\( A_{ij} = (-1)^{i+j} \\cdot det(M_{ij}) \\), trong đó \\( M_{ij} \\) là ma trận được tạo thành từ ma trận \\( A \\) sau khi bỏ đi hàng \\( i \\) và cột \\( j \\).",
    url: "topics/sub_topic/dinh_thuc.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: ĐỊNH THỨC",
    section: "Mục 4: Định thức cấp n",
    subsection: "Khai triển Laplace",
    content:
      "Từ định nghĩa phần bù đại số, định thức của ma trận vuông \\( A \\) được xác định bằng công thức khai triển định thức theo hàng thứ \\( i \\) hoặc khai triển định thức theo cột thứ \\( j \\). Cần chú ý đến đại lượng xác định dấu \\( (-1)^{i+j} \\).",
    url: "topics/sub_topic/dinh_thuc.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: ĐỊNH THỨC",
    section: "Tính chất quan trọng",
    subsection: "Tính chất 1 - 4",
    content:
      "1. Định thức không thay đổi qua phép chuyển vị: \\( detA^T = detA \\). 2. Đổi chỗ hai hàng (hoặc 2 cột) thì định thức đổi dấu. 3. Tất cả phần tử một hàng nhân với \\( \\lambda \\) thì định thức mới nhân với \\( \\lambda \\). 4. Tính đa tuyến tính thay phiên của định thức.",
    url: "topics/sub_topic/dinh_thuc.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: ĐỊNH THỨC",
    section: "Tính chất quan trọng",
    subsection: "Tính chất 5 - 8",
    content:
      "5. Định thức bằng 0 nếu có 2 hàng (cột) bằng nhau, tỉ lệ với nhau hoặc một hàng là tổ hợp tuyến tính của các hàng khác. 6. Không thay đổi nếu cộng vào một hàng (cột) một tổ hợp tuyến tính của các hàng khác. 7. Ma trận tam giác có định thức bằng tích các phần tử trên đường chéo chính. 8. Định lý nhân định thức: \\( det(AB) = det(A) \\cdot det(B) \\).",
    url: "topics/sub_topic/dinh_thuc.html#ly-thuyet",
  },

  // ==============================================
  // CHỦ ĐỀ: HẠNG MA TRẬN
  // ==============================================
  {
    topic: "CHỦ ĐỀ: HẠNG MA TRẬN",
    section: "Mục 1: Ma trận con",
    subsection: "Định nghĩa",
    content:
      "Cho \\( A \\) là ma trận cấp \\( m \\times n \\). Ma trận được tạo thành từ các phần tử nằm ở phần giao giữa \\( r \\) hàng và \\( r \\) cột của ma trận \\( A \\) được gọi là ma trận con cấp \\( r \\) của \\( A \\).",
    url: "topics/sub_topic/hang_matran.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HẠNG MA TRẬN",
    section: "Mục 2: Định nghĩa hạng ma trận",
    subsection: "Khái niệm",
    content:
      "Hạng của một ma trận \\( A \\) là cấp cao nhất của các định thức con khác không có trong \\( A \\). Ký hiệu là \\( rank(A) \\) hay \\( r(A) \\). Nếu \\( r(A) = k \\) thì mọi định thức con cấp lớn hơn \\( k \\) đều bằng 0.",
    url: "topics/sub_topic/hang_matran.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HẠNG MA TRẬN",
    section: "Mục 2: Định nghĩa hạng ma trận",
    subsection: "Các tính chất",
    content:
      "Ma trận không có hạng bằng 0. Hạng không đổi qua chuyển vị. Nếu \\( A \\) là ma trận vuông cấp \\( n \\): \\( r(A) = n \\) thì khả nghịch, \\( r(A) < n \\) thì suy biến. \\( r(AB) \\le \\min\\{r(A), r(B)\\} \\).",
    url: "topics/sub_topic/hang_matran.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HẠNG MA TRẬN",
    section: "Mục 3: Ma trận bậc thang",
    subsection: "Định nghĩa",
    content:
      "Ma trận khác không được gọi là ma trận bậc thang nếu: 1) Các hàng bằng không (nếu có) nằm dưới cùng. 2) Phần tử khác 0 đầu tiên của hàng dưới nằm bên phải phần tử khác 0 đầu tiên của hàng trên.",
    url: "topics/sub_topic/hang_matran.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HẠNG MA TRẬN",
    section: "Mục 4: Các phép biến đổi sơ cấp",
    subsection: "Phép biến đổi trên ma trận",
    content:
      "1. Nhân 1 số \\( \\lambda \\neq 0 \\) vào 1 hàng. 2. Đổi chỗ 2 hàng. 3. Cộng vào 1 hàng với 1 hàng khác đã nhân \\( \\lambda \\). Lưu ý: Hạng của ma trận không đổi qua các phép biến đổi sơ cấp.",
    url: "topics/sub_topic/hang_matran.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HẠNG MA TRẬN",
    section: "Mục 5: Phương pháp Gauss",
    subsection: "Quy tắc tìm hạng ma trận",
    content:
      "Dùng các phép biến đổi sơ cấp đưa ma trận \\( A \\) về ma trận bậc thang \\( B \\). Lúc đó hạng của ma trận \\( A \\) bằng số hàng khác không của ma trận \\( B \\) (\\( r(A) = r(B) \\)).",
    url: "topics/sub_topic/hang_matran.html#ly-thuyet",
  },

  // ==============================================
  // CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH
  // ==============================================
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 1: Định nghĩa",
    subsection: "Hệ phương trình tuyến tính tổng quát",
    content:
      "Một hệ phương trình tuyến tính là hệ thống gồm \\( m \\) phương trình bậc nhất với \\( n \\) ẩn. Rõ ràng hệ phương trình có thể được viết lại dưới dạng phương trình ma trận \\( AX = B \\). Ta gọi \\( A \\) là ma trận hệ số, \\( X \\) là ma trận cột ẩn số và \\( B \\) là ma trận cột hệ số tự do.",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 1: Định nghĩa",
    subsection: "Ma trận hệ số mở rộng",
    content:
      "Ký hiệu \\( A^{bs} \\) hay \\( \\bar{A} = (A \\mid B) \\) được gọi là ma trận hệ số mở rộng hay ma trận bổ sung của hệ. Được tạo bằng cách ghép thêm cột hệ số tự do \\( B \\) vào bên phải ma trận hệ số \\( A \\).",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 2: Định lý Kronecker-Capelli",
    subsection: "Biện luận số nghiệm",
    content:
      "Điều kiện có nghiệm của hệ được biện luận dựa trên hạng của ma trận hệ số \\( A \\) và ma trận hệ số mở rộng \\( \\bar{A} \\): 1. \\( r(A) < r(\\bar{A}) \\Rightarrow \\) Hệ vô nghiệm. 2. \\( r(A) = r(\\bar{A}) = n \\Rightarrow \\) Hệ có nghiệm duy nhất. 3. \\( r(A) = r(\\bar{A}) = r < n \\Rightarrow \\) Hệ có vô số nghiệm (phụ thuộc vào \\( n - r \\) tham số).",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 3: Hệ phương trình Cramer",
    subsection: "3.1 Định nghĩa",
    content:
      "Hệ phương trình Cramer là hệ phương trình tuyến tính thỏa mãn đồng thời hai điều kiện: Số phương trình bằng số ẩn và Ma trận hệ số \\( A \\) là ma trận không suy biến hay \\( \\det(A) \\neq 0 \\).",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 3: Hệ phương trình Cramer",
    subsection: "3.2 Quy tắc Cramer",
    content:
      "Cho hệ Cramer có dạng ma trận \\( AX = B \\). Hệ luôn có nghiệm duy nhất được xác định bởi công thức: \\( x_j = \\frac{D_j}{D}, \\forall j = \\overline{1, n} \\). Trong đó \\( D = \\det(A) \\) và \\( D_j \\) là định thức của ma trận nhận được bằng cách thay cột thứ \\( j \\) của \\( A \\) bằng cột hệ số tự do \\( B \\).",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 4: Giải hệ phương trình bằng phương pháp khử Gauss",
    subsection: "Các bước giải",
    content:
      "1. Xác định ma trận hệ số mở rộng \\( \\bar{A} = (A \\mid B) \\). 2. Sử dụng các phép biến đổi sơ cấp trên dòng để biến đổi sao cho ma trận hệ số mở rộng chuyển thành dạng bậc thang. 3. Giải hệ phương trình bằng quá trình ngược.",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 5: Hệ phương trình tuyến tính thuần nhất",
    subsection: "5.1 Định nghĩa & 5.2 Tính chất nghiệm",
    content:
      "Hệ phương trình tuyến tính thuần nhất là hệ có dạng ma trận \\( AX = 0 \\). Hệ luôn có nghiệm. Bộ số \\( (0, 0, \\dots, 0) \\) luôn là một nghiệm và được gọi là nghiệm tầm thường. Các nghiệm khác (nếu có) được gọi là nghiệm không tầm thường. Hạng của ma trận hệ số bằng hạng của ma trận mở rộng: \\( r(A) = r(\\bar{A}) \\).",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 5: Hệ phương trình tuyến tính thuần nhất",
    subsection: "5.3 & 5.4 Biện luận số nghiệm",
    content:
      "Với hệ thuần nhất ma trận vuông cấp \\( n \\): \\( \\det(A) \\neq 0 \\Leftrightarrow \\) Hệ chỉ có duy nhất nghiệm tầm thường \\( (X = 0) \\). \\( \\det(A) = 0 \\Leftrightarrow \\) Hệ có vô số nghiệm. Nếu hệ tổng quát: \\( r(A) = n \\) (có nghiệm duy nhất là \\( 0 \\)) và \\( r(A) < n \\) (có vô số nghiệm, phụ thuộc \\( n - r(A) \\) tham số).",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },

  // ==============================================
  // CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH
  // ==============================================
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 1: Định nghĩa",
    subsection: "Hệ phương trình tuyến tính tổng quát",
    content:
      "Hệ phương trình tuyến tính gồm \\( m \\) phương trình bậc nhất với \\( n \\) ẩn. Có thể viết dưới dạng ma trận \\( AX = B \\), trong đó \\( A \\) là ma trận hệ số, \\( X \\) là cột ẩn số, \\( B \\) là cột hệ số tự do.",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 1: Định nghĩa",
    subsection: "Ma trận hệ số mở rộng",
    content:
      "Ký hiệu \\( A^{bs} \\) hay \\( \\bar{A} = (A \\mid B) \\) được gọi là ma trận hệ số mở rộng (bổ sung). Nó được tạo bằng cách ghép thêm cột hệ số tự do \\( B \\) vào bên phải ma trận hệ số \\( A \\).",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 2: Định lý Kronecker-Capelli",
    subsection: "Biện luận nghiệm qua hạng ma trận",
    content:
      "Điều kiện có nghiệm dựa trên hạng của ma trận \\( A \\) và \\( \\bar{A} \\): 1) \\( r(A) < r(\\bar{A}) \\): Hệ vô nghiệm. 2) \\( r(A) = r(\\bar{A}) = n \\): Hệ có nghiệm duy nhất. 3) \\( r(A) = r(\\bar{A}) = r < n \\): Hệ có vô số nghiệm (phụ thuộc \\( n - r \\) tham số).",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 3: Hệ phương trình Cramer",
    subsection: "Định nghĩa và Quy tắc Cramer",
    content:
      "Hệ Cramer thỏa mãn 2 điều kiện: Số phương trình bằng số ẩn và \\( \\det(A) \\neq 0 \\). Hệ luôn có nghiệm duy nhất tính bởi công thức: \\( x_j = \\frac{D_j}{D} \\). Trong đó \\( D_j \\) là định thức nhận được bằng cách thay cột thứ \\( j \\) của \\( A \\) bằng cột hệ số tự do \\( B \\).",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 4: Phương pháp khử Gauss",
    subsection: "Các bước giải",
    content:
      "Để giải hệ bằng phương pháp Gauss: 1) Lập ma trận hệ số mở rộng \\( \\bar{A} \\). 2) Dùng phép biến đổi sơ cấp trên dòng đưa \\( \\bar{A} \\) về ma trận bậc thang. 3) Giải hệ phương trình bằng quá trình ngược (từ dưới lên).",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 5: Hệ phương trình thuần nhất",
    subsection: "Tính chất nghiệm",
    content:
      "Hệ thuần nhất có dạng \\( AX = 0 \\). Hệ này LUÔN CÓ NGHIỆM. Bộ số \\( (0, 0, \\dots, 0) \\) luôn là nghiệm và gọi là nghiệm tầm thường. Các nghiệm khác (nếu có) gọi là nghiệm không tầm thường.",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: HỆ PHƯƠNG TRÌNH TUYẾN TÍNH",
    section: "Mục 5: Hệ phương trình thuần nhất",
    subsection: "Biện luận số nghiệm",
    content:
      "Đối với hệ thuần nhất: Nếu \\( r(A) = n \\) (hoặc \\( \\det(A) \\neq 0 \\)), hệ có duy nhất nghiệm tầm thường \\( X = 0 \\). Nếu \\( r(A) < n \\) (hoặc \\( \\det(A) = 0 \\)), hệ có vô số nghiệm không tầm thường.",
    url: "topics/sub_topic/hpt_tuyentinh.html#ly-thuyet",
  },

  // ==============================================
  // CHỦ ĐỀ: MA TRẬN NGHỊCH ĐẢO
  // ==============================================
  {
    topic: "CHỦ ĐỀ: MA TRẬN NGHỊCH ĐẢO",
    section: "Mục 1: Định nghĩa",
    subsection: "Định nghĩa ma trận khả nghịch",
    content:
      "Cho \\( A \\) là ma trận vuông cấp \\( n \\), ma trận \\( A \\) gọi là ma trận khả nghịch nếu tồn tại ma trận \\( B \\) vuông cấp \\( n \\) sao cho: \\( AB = BA = I_n \\). Nếu \\( A \\) là ma trận khả nghịch thì ma trận \\( B \\) thỏa điều kiện trên là duy nhất và \\( B \\) được gọi là ma trận nghịch đảo của ma trận \\( A \\), ký hiệu là \\( A^{-1} \\).",
    url: "topics/sub_topic/matran_nghich_dao.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: MA TRẬN NGHỊCH ĐẢO",
    section: "Mục 1: Định nghĩa",
    subsection: "Các tính chất quan trọng",
    content:
      "Ta nhấn mạnh rằng tính khả nghịch chỉ có nghĩa đối với ma trận vuông. Ma trận đơn vị \\( I_n \\) luôn khả nghịch. Ma trận không \\( O_n \\) không khả nghịch. Tích của các ma trận khả nghịch là ma trận khả nghịch: \\( (AB)^{-1} = B^{-1} \\cdot A^{-1} \\).",
    url: "topics/sub_topic/matran_nghich_dao.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: MA TRẬN NGHỊCH ĐẢO",
    section: "Mục 2: Ma trận phụ hợp",
    subsection: "Định nghĩa và thiết lập",
    content:
      "Ma trận phụ hợp của \\( A \\), ký hiệu \\( P_A \\) được thiết lập từ các phần bù đại số \\( A_{ij} \\) của ma trận gốc, nhưng được sắp xếp theo vị trí chuyển vị (hàng thành cột).",
    url: "topics/sub_topic/matran_nghich_dao.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: MA TRẬN NGHỊCH ĐẢO",
    section: "Mục 2: Ma trận phụ hợp",
    subsection: "Điều kiện khả nghịch và công thức tính",
    content:
      "Một ma trận vuông khả nghịch khi và chỉ khi định thức của nó khác không (\\( \\det(A) \\neq 0 \\)). Khi đó ta có công thức tính ma trận nghịch đảo bằng ma trận phụ hợp: \\( A^{-1} = \\frac{1}{\\det(A)} \\cdot P_A \\).",
    url: "topics/sub_topic/matran_nghich_dao.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: MA TRẬN NGHỊCH ĐẢO",
    section: "Mục 3: Tìm ma trận nghịch đảo bằng phương pháp Gauss",
    subsection: "Thuật toán Gauss-Jordan",
    content:
      "Để tìm ma trận nghịch đảo của một ma trận vuông \\( A \\) cấp \\( n \\), ta lập ma trận mở rộng bằng cách thêm ma trận đơn vị cùng cấp vào bên phải, ký hiệu là \\( [A \\mid I_n] \\). Sau đó, thực hiện các phép biến đổi sơ cấp trên dòng để đưa về dạng \\( [I_n \\mid A^{-1}] \\).",
    url: "topics/sub_topic/matran_nghich_dao.html#ly-thuyet",
  },

  // ==============================================
  // CHỦ ĐỀ: VECTOR VÀ VECTOR TRONG R^n
  // ==============================================
  {
    topic: "CHỦ ĐỀ: VECTOR VÀ VECTOR TRONG Rn",
    section: "Mục 1: Ôn tập về Vector",
    subsection: "1. Vector là gì?",
    content:
      "Ở phổ thông, vector được định nghĩa là một đoạn thẳng có hướng, ký hiệu là \\( \\overrightarrow{AB} \\). Về mặt đại số, một vector \\( \\vec{v} \\) trong mặt phẳng được biểu diễn bằng một cặp số theo thứ tự: \\( \\vec{v} = (v_1, v_2) \\). Các giá trị này được gọi là các thành phần (hay tọa độ) của vector.",
    url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: VECTOR VÀ VECTOR TRONG Rn",
    section: "Mục 1: Ôn tập về Vector",
    subsection: "2. Độ dài của vector",
    content:
      "Độ dài (hay chuẩn) là khoảng cách giữa điểm đầu và điểm cuối, ký hiệu \\( |\\overrightarrow{AB}| \\). Tính bằng định lý Pythagoras: Nếu \\( \\vec{v} = (x, y) \\) thì \\( |\\vec{v}| = \\sqrt{x^2 + y^2} \\). Nếu tạo bởi \\( A \\) và \\( B \\) thì \\( |\\overrightarrow{AB}| = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2} \\).",
    url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: VECTOR VÀ VECTOR TRONG Rn",
    section: "Mục 1: Ôn tập về Vector",
    subsection: "3. Phương, hướng và bằng nhau",
    content:
      "Đường thẳng đi qua điểm đầu và cuối gọi là giá. Hai vector cùng phương nếu giá song song hoặc trùng nhau. Cùng phương thì có thể cùng hướng hoặc ngược hướng. Hai vector bằng nhau nếu cùng độ dài và cùng hướng.",
    url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: VECTOR VÀ VECTOR TRONG Rn",
    section: "Mục 1: Ôn tập về Vector",
    subsection: "4. Tổng của hai vector",
    content:
      "Quy tắc 3 điểm (nối đuôi): \\( \\overrightarrow{AB} + \\overrightarrow{BC} = \\overrightarrow{AC} \\). Quy tắc hình bình hành (chung gốc): \\( \\overrightarrow{AB} + \\overrightarrow{AD} = \\overrightarrow{AC} \\). Về đại số: \\( \\vec{u} + \\vec{v} = (u_1 + v_1, u_2 + v_2) \\).",
    url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: VECTOR VÀ VECTOR TRONG Rn",
    section: "Mục 1: Ôn tập về Vector",
    subsection: "5. Hiệu của hai vector",
    content:
      "Vector không \\( \\vec{0} \\) có độ dài bằng 0. Vector đối \\( -\\vec{v} \\) cùng độ dài nhưng ngược hướng. Hiệu hai vector \\( \\vec{a} - \\vec{b} = \\vec{a} + (-\\vec{b}) \\). Quy tắc hiệu: \\( \\overrightarrow{OB} - \\overrightarrow{OA} = \\overrightarrow{AB} \\).",
    url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: VECTOR VÀ VECTOR TRONG Rn",
    section: "Mục 1: Ôn tập về Vector",
    subsection: "6. Phép nhân vector với số thực",
    content:
      "Tích \\( k \\cdot \\vec{v} \\) tạo ra vector cùng phương. Cùng hướng nếu \\( k > 0 \\), ngược hướng nếu \\( k < 0 \\). Độ dài \\( |k\\vec{v}| = |k| \\cdot |\\vec{v}| \\). Về đại số: \\( k \\cdot (v_1, v_2) = (kv_1, kv_2) \\).",
    url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: VECTOR VÀ VECTOR TRONG Rn",
    section: "Mục 2: Vector trong không gian n chiều",
    subsection: "1. Khái niệm",
    content:
      "Vector được mở rộng lên không gian \\( n \\) chiều (\\( \\mathbb{R}^n \\)), biểu diễn bởi bộ \\( n \\) phần tử: \\( \\vec{v} = (v_1, v_2, \\dots, v_n) \\). Hai vector bằng nhau khi mọi thành phần tương ứng bằng nhau.",
    url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet",
  },
  {
    topic: "CHỦ ĐỀ: VECTOR VÀ VECTOR TRONG Rn",
    section: "Mục 2: Vector trong không gian n chiều",
    subsection: "2. Các phép toán cơ bản",
    content:
      "Các phép toán được mở rộng tự nhiên từ mặt phẳng: Phép cộng cộng từng thành phần. Phép nhân vô hướng nhân số thực vào từng thành phần. Vector không \\( \\vec{0} = (0, \\dots, 0) \\). Vector đối đảo dấu các thành phần.",
    url: "topics/sub_topic/vector_pho_thong.html#ly-thuyet",
  },
];
