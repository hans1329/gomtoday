export default function LoadingBar() {
  return (
    <div className="min-h-screen flex items-center justify-center gradient-soft">
      <div className="w-64 h-5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-primary via-primary/60 to-primary animate-shimmer bg-[length:200%_100%]" />
      </div>
    </div>
  );
}
