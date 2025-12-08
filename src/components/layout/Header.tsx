import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Github, Palette } from 'lucide-react';
export function Header() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
    }`;
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F38020] to-[#E55A1B] flex items-center justify-center shadow-primary">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-display font-bold leading-tight">
                  Color Journey Palette Engine
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  using the OKLab color space, based on Björn Ottosson's work (MIT License)
                </p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-4 mr-2">
              <NavLink to="/" className={navLinkClass}>Home</NavLink>
              <NavLink to="/presets" className={navLinkClass}>Presets</NavLink>
              <NavLink to="/docs" className={navLinkClass}>API Docs</NavLink>
            </nav>
            <Button variant="ghost" size="icon" asChild>
              <a href="https://github.com/cloudflare/workers-ai-apis" target="_blank" rel="noopener noreferrer" aria-label="GitHub Repository">
                <Github className="h-5 w-5" />
              </a>
            </Button>
            <ThemeToggle className="relative top-0 right-0" />
          </div>
        </div>
      </div>
    </motion.header>
  );
}