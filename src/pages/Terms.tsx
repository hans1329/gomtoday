import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen gradient-soft p-4">
      <div className="max-w-4xl mx-auto pt-8 pb-16">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="text-2xl">서비스 이용약관</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-2">제1조 (목적)</h3>
              <p className="text-muted-foreground">
                본 약관은 3rdMe(이하 "회사")가 제공하는 일기 작성 서비스(이하 "서비스")의 이용과 관련하여 
                회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">제2조 (정의)</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>"서비스"란 회사가 제공하는 AI 기반 일기 작성 플랫폼을 의미합니다.</li>
                <li>"이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 의미합니다.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">제3조 (약관의 효력 및 변경)</h3>
              <p className="text-muted-foreground">
                회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">제4조 (서비스의 제공)</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>사진 업로드 및 AI 일기 생성</li>
                <li>일기 저장 및 관리</li>
                <li>일기장 공유 기능</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">제5조 (이용자의 의무)</h3>
              <p className="text-muted-foreground">
                이용자는 다음 행위를 하여서는 안 됩니다:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>타인의 정보 도용</li>
                <li>회사가 게시한 정보의 변경</li>
                <li>회사의 서비스 운영을 방해하는 행위</li>
                <li>불법적이거나 부적절한 콘텐츠 게시</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">제6조 (저작권 및 소유권)</h3>
              <p className="text-muted-foreground">
                서비스 내 모든 콘텐츠에 대한 저작권은 이용자에게 있으며, 
                회사는 서비스 제공 목적으로만 이를 사용합니다.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">제7조 (계약 해지)</h3>
              <p className="text-muted-foreground">
                이용자는 언제든지 회원 탈퇴를 통해 이용계약을 해지할 수 있습니다.
              </p>
            </section>

            <section className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                시행일자: 2024년 1월 1일
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
