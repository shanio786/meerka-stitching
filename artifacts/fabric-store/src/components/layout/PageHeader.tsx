import { Link } from "wouter";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  newAction?: {
    label: string;
    href: string;
  };
}

export function PageHeader({ title, description, actions, newAction }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid={`page-title-${title.toLowerCase().replace(/\s+/g, '-')}`}>{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1" data-testid="page-description">
            {description}
          </p>
        )}
      </div>
      {(actions || newAction) && (
        <div className="flex items-center gap-2">
          {actions}
          {newAction && (
            <Link href={newAction.href}>
              <Button data-testid="button-new-action">
                <Plus className="mr-2 h-4 w-4" />
                {newAction.label}
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
