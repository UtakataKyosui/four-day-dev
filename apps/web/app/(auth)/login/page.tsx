import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">健康管理アプリ</h1>
        <p className="text-muted-foreground mt-2">ログインしてください</p>
      </div>
      <LoginForm />
    </div>
  )
}
