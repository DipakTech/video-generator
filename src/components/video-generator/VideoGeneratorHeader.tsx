import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

interface VideoGeneratorHeaderProps {
  modePillLabel: string | null;
  isGenerating: boolean;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onGenerate: () => void;
}

export default function VideoGeneratorHeader({
  modePillLabel,
  isGenerating,
  theme,
  onToggleTheme,
  onGenerate,
}: VideoGeneratorHeaderProps) {
  return (
    <header className="mb-4 flex w-full flex-wrap items-center justify-end ">
      {/* <div className="flex items-center gap-3">
        <span className="text-xl font-semibold tracking-tight">VideoGen</span>
        <span className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">Nepali News Bulletin</span>
      </div> */}
      <div className="flex items-end gap-2">
        {modePillLabel && <Badge variant="secondary">{modePillLabel}</Badge>}
        <Button type="button" variant="outline" onClick={onToggleTheme}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </Button>
        <Button type="button" onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate"}
        </Button>
      </div>
    </header>
  );
}
