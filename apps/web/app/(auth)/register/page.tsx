import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">アカウント作成</h1>
        <p className="text-muted-foreground mt-2">新規登録</p>
      </div>
      <RegisterForm />
    </div>
  );
}
