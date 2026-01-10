import { useNavigate, Link } from "react-router-dom"
import { useForm, SubmitHandler } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/useAuth"

interface SignupFormInputs {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    setError
  } = useForm<SignupFormInputs>()
  
  const { signUp, signInWithGoogle, loading, error } = useAuth()
  const navigate = useNavigate()

  const onSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
    // Validate password match
    if (data.password !== data.confirmPassword) {
      setError("confirmPassword", {
        type: "manual",
        message: "Passwords do not match"
      })
      return
    }

    // Split name into firstName and lastName
    const nameParts = data.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Sign up with Firebase and persist to database
    const userCredential = await signUp(data.email, data.password, firstName, lastName)
    
    if (userCredential) {
      // Successfully signed up
      console.log("Signed up:", userCredential.user)
      navigate("/dashboard")
    }
  }

  const handleGoogleSignIn = async () => {
    const userCredential = await signInWithGoogle()
    
    if (userCredential) {
      // Successfully signed in with Google
      console.log("Signed in with Google:", userCredential.user)
      navigate("/dashboard")
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input 
                id="name" 
                type="text" 
                placeholder="John Doe" 
                {...register("name", { required: "Full name is required" })}
                disabled={loading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register("email", { 
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                })}
                disabled={loading}
              />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input 
                id="password" 
                type="password"
                {...register("password", { 
                  required: "Password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters long"
                  }
                })}
                disabled={loading}
              />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input 
                id="confirm-password" 
                type="password"
                {...register("confirmPassword", { 
                  required: "Please confirm your password"
                })}
                disabled={loading}
              />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  Sign up with Google
                </Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link to="/login" className="underline">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

export default function SignupPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  )
}