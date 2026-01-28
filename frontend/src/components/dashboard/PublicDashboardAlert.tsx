import { useNavigate } from "react-router-dom";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function PublicDashboardAlert() {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <Alert className="w-full">
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex-1">
            <AlertTitle>Explore what MindMap has to offer</AlertTitle>
            <AlertDescription>
              Create an account to save, edit, and share your maps.
            </AlertDescription>
          </div>
          <AlertAction>
            <Button
              size="sm"
              variant="default"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </Button>
          </AlertAction>
        </div>
      </Alert>
    </div>
  );
}
