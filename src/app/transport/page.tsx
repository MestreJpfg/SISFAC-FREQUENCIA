
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bus } from 'lucide-react';
import { TransportForm } from './TransportForm';

export default async function TransportPage() {

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/20 p-3 rounded-lg">
                            <Bus className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="font-headline capitalize">Controle de Transporte Escolar</CardTitle>
                            <CardDescription className="mt-1">Gerencie quais alunos utilizam o transporte escolar e suas respectivas rotas.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <TransportForm />
                </CardContent>
            </Card>
        </>
    );
}
