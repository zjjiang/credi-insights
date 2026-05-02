import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";

type Status = "pending" | "processing" | "done" | "failed";

const statusConfig: Record<
  Status,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  pending: {
    label: "等待处理",
    variant: "outline",
    icon: <Clock className="h-3 w-3" />,
  },
  processing: {
    label: "识别中",
    variant: "secondary",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  done: {
    label: "已完成",
    variant: "default",
    icon: <CheckCircle className="h-3 w-3" />,
  },
  failed: {
    label: "识别失败",
    variant: "destructive",
    icon: <XCircle className="h-3 w-3" />,
  },
};

interface ProcessingStatusProps {
  status: Status;
}

export function ProcessingStatus({ status }: ProcessingStatusProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}
