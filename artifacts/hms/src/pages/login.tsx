import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, User, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { login: setAuth } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: (response) => {
        setAuth(response.token, response.user);
        if (response.user.role === "admin") setLocation("/admin");
        else if (response.user.role === "doctor") setLocation("/doctor");
        else setLocation("/patient");
      },
      onError: (error) => {
        toast({
          title: "Login Failed",
          description: error.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    });
  };

  const handleDemoLogin = (email: string) => {
    form.setValue("email", email);
    form.setValue("password", "demo1234");
    form.handleSubmit(onSubmit)();
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col justify-center items-center p-4">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold">
          H
        </div>
        <span className="font-bold text-xl">CareSync</span>
      </Link>

      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>Enter your email and password to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </Form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Demo Accounts</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handleDemoLogin("admin@hms.demo")}>
                <Shield className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium text-sm">Admin</div>
                  <div className="text-xs text-muted-foreground font-mono">admin@hms.demo</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handleDemoLogin("dr.james@hms.demo")}>
                <Users className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium text-sm">Doctor</div>
                  <div className="text-xs text-muted-foreground font-mono">dr.james@hms.demo</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => handleDemoLogin("alice@hms.demo")}>
                <User className="mr-3 h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium text-sm">Patient</div>
                  <div className="text-xs text-muted-foreground font-mono">alice@hms.demo</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t p-4">
          <p className="text-sm text-muted-foreground">
            Don't have an account? <Link href="/register" className="text-primary hover:underline">Register here</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
