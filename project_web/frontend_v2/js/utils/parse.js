(function () {
  window.App = window.App || {};

  App.parseVectorExpr = function (str) {
    if (!str) return null;
    let s = str.trim().toLowerCase();

    // 1. Dọn dẹp ký tự lạ & Chuẩn hóa
    s = s.replace(/\\left/g, "").replace(/\\right/g, "");
    s = s.replace(/\\lbrack/g, "[").replace(/\\rbrack/g, "]");
    s = s.replace(/\\lbrace/g, "(").replace(/\\rbrace/g, ")");
    // Thay dấu nhân
    s = s.replace(/\\cdot/g, "*").replace(/\\times/g, "*");
    // Xóa dấu chấm thừa (nếu có, cẩn thận kẻo xóa dấu thập phân)
    s = s.replace(/\s+\.\s+/g, "*");

    // 2. XỬ LÝ TOÁN HỌC (QUAN TRỌNG)

    // [FIX] Phân số: Chấp nhận \frac{a}{b}, frac{a}{b}, \frac a b
    s = s.replace(/\\?frac\s*\{?(.+?)\}?\s*\{?(.+?)\}?/gi, "($1)/($2)");

    // [FIX] Logarit cơ số n: \log_2(8) -> log(8)/log(2)
    s = s.replace(/\\?log_\{?(\d+|e)\}?\(?(.+?)\)?/g, "(log($2)/log($1))");

    // [FIX LỖI CỦA ÔNG] Logarit tự nhiên (ln) và log thường
    // Chấp nhận cả: \ln, ln, \log, log
    // Thay thế hết thành "log" (để tí nữa hàm evaluate chuyển thành Math.log)
    s = s.replace(/\\?ln\b/g, "log");
    s = s.replace(/\\?log\b/g, "log");

    // [FIX] Căn thức: \sqrt[3]{8} -> 8^(1/3)
    s = s.replace(/\\?sqrt\s*\[(.+?)\]\s*\{(.+?)\}/g, "(($2)**(1/($1)))");
    // Căn bậc 2: \sqrt{4}, sqrt(4), sqrt4
    s = s.replace(/\\?sqrt\s*\{?(.+?)\}?/g, "sqrt($1)");

    // Lượng giác & Mũ
    s = s.replace(/cot\((.+?)\)/g, "(1/tan($1))");
    s = s.replace(/\^/g, "**");

    // 3. Xóa dấu gạch chéo còn sót lại
    s = s.replace(/\\/g, "");

    // 4. Nhân ẩn (Implicit Multiplication)
    // Số nhân chữ/ngoặc: 2x -> 2*x, 2(3) -> 2*(3)
    s = s.replace(/(\d)\s*([a-z\(])/g, "$1*$2");
    // Ngoặc nhân số: )2 -> )*2
    s = s.replace(/([a-z\)])\s*(\d)/g, "$1*$2");
    // Ngoặc nhân ngoặc: )( -> )*(
    s = s.replace(/(\))\s*(\()/g, "$1*$2");
    // Hằng số nhân số: pi2 -> pi*2
    s = s.replace(/\b(pi|e)\s*(\d)/g, "$1*$2");

    // 5. Tách mảng vector
    if (
      (s.startsWith("[") && s.endsWith("]")) ||
      (s.startsWith("(") && s.endsWith(")"))
    ) {
      s = s.substring(1, s.length - 1);
    }
    let parts = s.split(",");

    // 6. Hàm tính toán an toàn
    const evaluate = (expr) => {
      if (!expr || !expr.trim()) return 0;
      try {
        let e = expr.trim();

        // Kiểm tra xem có dùng độ hay radian (nếu có pi/e thì ưu tiên radian)
        const isRadianContext = /\b(pi|e)\b/.test(e);

        // Map các hàm toán học sang JS Math
        // Lưu ý: 'log' ở đây là Logarit tự nhiên (ln) theo chuẩn JS
        e = e
          .replace(/\bpi\b/g, "Math.PI")
          .replace(/\be\b/g, "Math.E")
          .replace(/\bsqrt\b/g, "Math.sqrt")
          .replace(/\babs\b/g, "Math.abs")
          .replace(/\blog\b/g, "Math.log") // [QUAN TRỌNG] log -> Math.log (ln)
          .replace(
            /\bsin\b/g,
            isRadianContext ? "Math.sin" : "((x)=>Math.sin(x*Math.PI/180))",
          )
          .replace(
            /\bcos\b/g,
            isRadianContext ? "Math.cos" : "((x)=>Math.cos(x*Math.PI/180))",
          )
          .replace(
            /\btan\b/g,
            isRadianContext ? "Math.tan" : "((x)=>Math.tan(x*Math.PI/180))",
          );

        // Sửa lại cú pháp hàm tự tạo (nếu dùng sin độ)
        if (e.includes("((x)=>")) {
          // Kỹ thuật này hơi phức tạp để replace string,
          // nên ta dùng cách đơn giản hơn: Map cứng trong scope
        }

        // Cách tốt nhất: Dùng Scope biến
        const mathScope = {
          pi: Math.PI,
          e: Math.E,
          sqrt: Math.sqrt,
          abs: Math.abs,
          log: Math.log,
          // Nếu muốn log10 thì dùng Math.log10
          log10: Math.log10,

          // Trigono thông minh
          sin: (x) =>
            isRadianContext ? Math.sin(x) : Math.sin((x * Math.PI) / 180),
          cos: (x) =>
            isRadianContext ? Math.cos(x) : Math.cos((x * Math.PI) / 180),
          tan: (x) =>
            isRadianContext ? Math.tan(x) : Math.tan((x * Math.PI) / 180),
          cot: (x) =>
            isRadianContext
              ? 1 / Math.tan(x)
              : 1 / Math.tan((x * Math.PI) / 180),
        };

        const keys = Object.keys(mathScope);
        const values = Object.values(mathScope);

        // Fix lỗi implicit math (2Math.PI -> 2*Math.PI) - Đã xử lý ở bước 4 nhưng check lại
        // Ở đây ta đưa chuỗi đã replace Math về lại dạng gọi hàm
        // Nhưng vì ta dùng Scope nên e chỉ cần chứa tên hàm (sin, cos...) là được
        // Ta cần Undo các replace Math. ở trên nếu lỡ làm (nhưng ở trên ta chưa replace full)

        // Chạy hàm
        return new Function(...keys, `return (${e})`)(...values);
      } catch (err) {
        console.warn("Parse Error:", expr);
        return NaN;
      }
    };

    return parts.map((p) => {
      const val = evaluate(p);
      if (isNaN(val)) throw new Error(`Lỗi cú pháp: "${p}"`);
      return val;
    });
  };

  // Hàm format hiển thị (giữ nguyên)
  App.formatVectorShort = function (vec) {
    if (!Array.isArray(vec)) return "[]";
    return (
      "[" +
      vec
        .map((n) => {
          const r = Math.round(n * 10000) / 10000;
          return r.toString();
        })
        .join(", ") +
      "]"
    );
  };
})();
