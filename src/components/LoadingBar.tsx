export default function LoadingBar() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-soft gap-4">
      <img src="/3rdme-logo.png" alt="3rdME" className="w-12 h-12" />
      <div className="w-64 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary via-primary/60 to-primary animate-shimmer bg-[length:200%_100%]" />
      </div>
    </div>
  );
}
