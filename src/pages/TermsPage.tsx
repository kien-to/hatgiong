import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
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

export function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Card className="space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-2xl font-extrabold">Điều khoản sử dụng</h1>
          <p className="mt-1 text-sm text-muted">Cập nhật lần cuối: {UPDATED}</p>
        </div>

        <p className="text-sm leading-relaxed text-ink/80">
          Khi dùng Hạt Giống, bạn đồng ý với các điều khoản dưới đây. Nếu không đồng ý, vui lòng ngừng sử dụng ứng dụng.
        </p>

        <Section title="1. Hạt Giống là gì">
          <p>
            Hạt Giống là ứng dụng giáo dục miễn phí, cho phép bạn tập đầu tư chứng khoán Việt Nam bằng <b>tiền ảo</b>. Không có tiền thật nào được nạp, rút hay giao
            dịch. Lệnh của bạn không được gửi tới bất kỳ sàn hay công ty chứng khoán nào.
          </p>
          <p>Hạt Giống không phải công ty chứng khoán và không cung cấp dịch vụ môi giới, tư vấn đầu tư hay quản lý tài sản.</p>
        </Section>

        <Section title="2. Không phải lời khuyên đầu tư">
          <p>
            Bài học, số liệu và câu trả lời của trợ lý Mầm chỉ nhằm mục đích giáo dục. Chúng không phải khuyến nghị mua, bán hay nắm giữ bất kỳ chứng khoán nào. Kết
            quả trên tiền ảo không đảm bảo kết quả khi đầu tư thật. Hãy tự tìm hiểu kỹ và cân nhắc rủi ro trước mọi quyết định đầu tư thật.
          </p>
          <p>Mầm là trợ lý AI và có thể trả lời sai. Hãy kiểm tra lại thông tin quan trọng.</p>
        </Section>

        <Section title="3. Dữ liệu thị trường">
          <p>
            Giá và thông tin doanh nghiệp được lấy từ nguồn công khai và có thể chậm, thiếu hoặc sai. Việc khớp lệnh trong Hạt Giống là mô phỏng và có thể khác với
            cách khớp lệnh trên sàn thật.
          </p>
        </Section>

        <Section title="4. Tài khoản của bạn">
          <ul className="list-disc space-y-1 pl-5">
            <li>Bạn chịu trách nhiệm giữ bí mật mật khẩu và mọi hoạt động trên tài khoản của mình.</li>
            <li>Tài khoản khách tự động bị xóa sau 30 ngày không sử dụng.</li>
            <li>Bạn có thể yêu cầu xóa tài khoản bất cứ lúc nào qua email {CONTACT}.</li>
          </ul>
        </Section>

        <Section title="5. Sử dụng hợp lý">
          <p>Bạn đồng ý không:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tấn công, làm quá tải hoặc tìm cách truy cập trái phép vào hệ thống.</li>
            <li>Dùng công cụ tự động để thu thập dữ liệu hoặc lạm dụng trợ lý Mầm.</li>
            <li>Đặt tên hiển thị hoặc tên lớp xúc phạm, mạo danh người khác, hoặc vi phạm pháp luật.</li>
            <li>Dùng Hạt Giống để quảng bá, mời gọi đầu tư hoặc lừa đảo người khác.</li>
          </ul>
          <p>Chúng tôi có thể tạm khóa hoặc xóa tài khoản vi phạm.</p>
        </Section>

        <Section title="6. Lớp học">
          <p>Người tạo lớp có thể xem tiến trình của thành viên trong lớp. Người tạo lớp chịu trách nhiệm về cách họ sử dụng thông tin đó.</p>
        </Section>

        <Section title="7. Dịch vụ “như hiện có”">
          <p>
            Hạt Giống được cung cấp miễn phí, “như hiện có”. Chúng tôi cố gắng giữ ứng dụng ổn định nhưng không cam kết ứng dụng luôn hoạt động hay không có lỗi, và có
            thể thay đổi, tạm dừng hoặc ngừng tính năng bất cứ lúc nào. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm cho thiệt hại phát sinh từ
            việc dùng ứng dụng, kể cả quyết định đầu tư thật dựa trên nội dung trong ứng dụng.
          </p>
        </Section>

        <Section title="8. Quyền riêng tư">
          <p>
            Cách chúng tôi thu thập và dùng dữ liệu được mô tả trong{' '}
            <Link to="/privacy" className="font-semibold text-brand-500 underline">
              Chính sách quyền riêng tư
            </Link>
            .
          </p>
        </Section>

        <Section title="9. Thay đổi và liên hệ">
          <p>
            Khi điều khoản thay đổi, chúng tôi cập nhật ngày ở đầu trang. Tiếp tục dùng ứng dụng nghĩa là bạn đồng ý với phiên bản mới. Điều khoản này tuân theo pháp
            luật Việt Nam. Liên hệ:{' '}
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
