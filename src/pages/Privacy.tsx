import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-screen gradient-soft p-4">
      <div className="max-w-4xl mx-auto pt-8 pb-16">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="text-2xl">개인정보 처리방침</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-2">1. 수집하는 개인정보 항목</h3>
              <p className="text-muted-foreground">
                3rdME는 회원가입 및 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>필수항목: 이메일 주소, 비밀번호, 이름</li>
                <li>선택항목: 프로필 사진</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">2. 개인정보의 수집 및 이용목적</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>회원 가입 및 관리</li>
                <li>서비스 제공 및 개선</li>
                <li>고객 문의 응대</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">3. 개인정보의 보유 및 이용기간</h3>
              <p className="text-muted-foreground">
                회원 탈퇴 시까지 보유하며, 탈퇴 후 즉시 파기합니다.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">4. 개인정보 제3자 제공</h3>
              <p className="text-muted-foreground">
                3rdME는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">5. 이용자의 권리</h3>
              <p className="text-muted-foreground">
                이용자는 언제든지 본인의 개인정보를 조회하거나 수정, 삭제할 수 있습니다.
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
