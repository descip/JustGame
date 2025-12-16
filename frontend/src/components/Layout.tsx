import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { MenuOutlined } from '@ant-design/icons'
import Sidebar from './Sidebar'
import './Layout.css'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      // На десктопе сайдбар всегда открыт
      if (!mobile) {
        setSidebarOpen(true)
      }
    }

    // Устанавливаем начальное состояние
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="layout">
      {isMobile && (
        <button 
          className="layout-menu-button" 
          onClick={() => setSidebarOpen(true)}
          aria-label="Открыть меню"
        >
          <MenuOutlined />
        </button>
      )}
      <Sidebar 
        isOpen={isMobile ? sidebarOpen : true} 
        onClose={() => setSidebarOpen(false)} 
      />
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  )
}


