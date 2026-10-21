import type { ReactNode } from 'react'
import { Card } from '@/components/ui'

const CONTACT = 'hotro@hatgiong.org'
const UPDATED = '21/10/2026'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-ink/80">{children}</div>
    </section>
  )
}

export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-2xl font-extrabold">Chính sách quyền riêng tư</h1>
          <p className="mt-1 text-sm text-muted">Cập nhật lần cuối: {UPDATED}</p>
        </div>

        <p className="text-sm leading-relaxed text-ink/80">
          Hạt Giống là ứng dụng miễn phí giúp bạn học đầu tư bằng tiền ảo. Chúng tôi chỉ thu thập những dữ liệu cần để ứng dụng hoạt động, không bán dữ liệu và
          không chạy quảng cáo. Chính sách này giải thích dữ liệu nào được lưu, vì sao, và bạn có những quyền gì theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá
          nhân.
        </p>

        <Section title="1. Dữ liệu chúng tôi lưu">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <b>Tài khoản:</b> email, và nếu bạn đăng nhập bằng Google thì tên và ảnh đại diện Google cung cấp. Mật khẩu được mã hóa, chúng tôi không đọc được.
            </li>
            <li>
              <b>Hồ sơ:</b> tên hiển thị và trình độ đầu tư bạn chọn khi bắt đầu.
            </li>
            <li>
              <b>Hoạt động trong ứng dụng:</b> lệnh mua bán bằng tiền ảo (kèm ghi chú nếu bạn viết), danh mục, danh sách theo dõi, kết quả bài kiểm tra và lớp học bạn
              tham gia.
            </li>
            <li>
              <b>Trợ lý Mầm:</b> chúng tôi chỉ lưu số lượng câu hỏi và độ dài câu trả lời để giới hạn sử dụng, không lưu nội dung câu hỏi.
            </li>
            <li>
              <b>Dữ liệu kỹ thuật:</b> nhà cung cấp máy chủ ghi nhật ký truy cập (địa chỉ IP, thời gian, trang được gọi) trong thời gian ngắn để vận hành và chống lạm
              dụng.
            </li>
          </ul>
          <p>Chúng tôi không thu thập số tài khoản ngân hàng, giấy tờ tùy thân hay tiền thật. Mọi giao dịch trong Hạt Giống đều là mô phỏng.</p>
        </Section>

        <Section title="2. Vì sao chúng tôi dùng dữ liệu">
          <ul className="list-disc space-y-1 pl-5">
            <li>Để lưu tiến trình học và danh mục của bạn trên mọi thiết bị.</li>
            <li>Để Mầm giải thích dựa trên danh mục và bài học hiện tại của bạn.</li>
            <li>Để giáo viên hoặc người tổ chức lớp xem tiến trình của thành viên trong lớp.</li>
            <li>Để gửi email xác nhận tài khoản. Chúng tôi không gửi email quảng cáo.</li>
          </ul>
        </Section>

        <Section title="3. Ai có thể thấy dữ liệu của bạn">
          <p>
            <b>Lớp học:</b> khi bạn tham gia một lớp bằng mã lớp, người tạo lớp thấy tên hiển thị, tỷ suất lợi nhuận và kết quả học của bạn. Bạn có thể rời lớp bất cứ
            lúc nào.
          </p>
          <p>Chúng tôi dùng các nhà cung cấp sau để vận hành ứng dụng. Họ chỉ xử lý dữ liệu theo yêu cầu của chúng tôi:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Supabase — cơ sở dữ liệu và đăng nhập (máy chủ tại Singapore).</li>
            <li>Fly.io — máy chủ ứng dụng (Singapore).</li>
            <li>Cloudflare — phân phối trang web.</li>
            <li>Anthropic — mô hình AI trả lời câu hỏi cho Mầm (Hoa Kỳ). Câu hỏi và bối cảnh danh mục được gửi đi để tạo câu trả lời.</li>
            <li>Google — nếu bạn chọn đăng nhập bằng Google.</li>
            <li>Resend — gửi email xác nhận.</li>
          </ul>
          <p>Một số nhà cung cấp đặt máy chủ ngoài Việt Nam, nên dữ liệu có thể được chuyển ra nước ngoài để xử lý.</p>
        </Section>

        <Section title="4. Thời gian lưu trữ">
          <p>Tài khoản khách (chưa đăng ký email) tự động bị xóa sau 30 ngày không sử dụng.</p>
          <p>Tài khoản đã đăng ký được giữ cho đến khi bạn yêu cầu xóa. Khi xóa, toàn bộ dữ liệu liên quan bị xóa theo.</p>
        </Section>

        <Section title="5. Quyền của bạn">
          <p>
            Bạn có quyền xem, sửa, tải về hoặc xóa dữ liệu của mình, và rút lại sự đồng ý bất cứ lúc nào. Gửi email tới{' '}
            <a href={`mailto:${CONTACT}`} className="font-semibold text-brand-500 underline">
              {CONTACT}
            </a>{' '}
            từ địa chỉ email của tài khoản. Chúng tôi phản hồi trong vòng 72 giờ.
          </p>
        </Section>

        <Section title="6. Người dùng dưới 16 tuổi">
          <p>Hạt Giống dành cho sinh viên và người từ 16 tuổi trở lên. Nếu bạn dưới 16 tuổi, hãy dùng ứng dụng khi có sự đồng ý của cha mẹ hoặc người giám hộ.</p>
        </Section>

        <Section title="7. Không phải lời khuyên đầu tư">
          <p>Nội dung và câu trả lời của Mầm chỉ nhằm mục đích giáo dục, không phải lời khuyên đầu tư hay khuyến nghị mua bán chứng khoán.</p>
        </Section>

        <Section title="8. Liên hệ và thay đổi">
          <p>
            Nếu chính sách thay đổi, chúng tôi sẽ cập nhật ngày ở đầu trang này. Câu hỏi về quyền riêng tư:{' '}
            <a href={`mailto:${CONTACT}`} className="font-semibold text-brand-500 underline">
              {CONTACT}
            </a>
            .
          </p>
        </Section>
      </Card>
    </div>
  )
}
