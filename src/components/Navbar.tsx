import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";

const baseNavItems = [
  { path: "/", label: "EVENTS" },
  { path: "/create", label: "CREATE" },
  { path: "/leaderboard", label: "LEADERBOARD" },
];

export default function Navbar() {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const { isAdmin } = useAdminCheck();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const navItems = isAdmin
    ? [...baseNavItems, { path: "/admin", label: "ADMIN" }]
    : baseNavItems;

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm tactical-border border-t-0 border-x-0">
      <div className="container flex items-center justify-between h-14 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center">
            <span className="font-display font-black text-primary-foreground text-sm">L</span>
          </div>
          <span className="font-display font-black text-lg tracking-tighter">LEMONTREE</span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="relative px-3 py-1.5"
            >
              <span className="text-label relative z-10">
                {item.label}
              </span>
              {location.pathname === item.path && (
                <motion.div
                  layoutId="nav-active"
                  className="absolute inset-0 bg-primary/10 rounded-sm"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          ))}
          {user ? (
            <button
              onClick={handleSignOut}
              className="ml-3 px-4 py-1.5 bg-foreground text-background text-label rounded-sm hover:opacity-90 transition-opacity"
            >
              SIGN OUT
            </button>
          ) : (
            <Link
              to="/login"
              className="ml-3 px-4 py-1.5 bg-foreground text-background text-label rounded-sm hover:opacity-90 transition-opacity"
            >
              SIGN IN
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
