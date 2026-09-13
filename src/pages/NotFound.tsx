import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="mb-1 text-sm font-semibold uppercase tracking-widest text-primary">PlantãoPro</p>
        <h1 className="mb-3 text-5xl font-bold tabular-nums text-foreground">404</h1>
        <p className="mb-6 text-base text-muted-foreground">Esta página não existe ou foi movida.</p>
        <a href="/" className="text-primary underline hover:text-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-sm">
          Voltar para o início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
