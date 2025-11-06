import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCog } from "lucide-react";
import { ProfileForm } from "./ProfileForm";

export default function ProfilePage() {
  return (
    <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
             <div className="bg-primary/20 p-3 rounded-lg">
                <UserCog className="w-8 h-8 text-primary" />
            </div>
            <div>
                <h1 className="text-3xl font-bold font-headline">Seu Perfil</h1>
                <p className="text-muted-foreground mt-1">
                    Visualize e atualize suas informações de perfil.
                </p>
            </div>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Detalhes do Perfil</CardTitle>
                <CardDescription>Mantenha seus dados atualizados.</CardDescription>
            </CardHeader>
            <CardContent>
                <ProfileForm />
            </CardContent>
        </Card>
    </div>
  );
}
