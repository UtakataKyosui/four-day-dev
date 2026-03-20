'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { logout } from '@/lib/auth'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: '🏠' },
  { href: '/meals', label: '食事記録', icon: '🍽️' },
  { href: '/sleep', label: '睡眠記録', icon: '😴' },
  { href: '/analysis', label: '健康分析', icon: '📊' },
  { href: '/settings', label: '設定', icon: '⚙️' },
]

export function NavSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    logout()
    router.push('/login')
  }

  return (
    <aside className="w-56 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-bold text-lg">健康管理</h2>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-1',
              pathname === item.href || pathname.startsWith(item.href + '/')
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <span>🚪</span>
          ログアウト
        </button>
      </div>
    </aside>
  )
}
