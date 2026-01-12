import { useForm, SubmitHandler } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAddContent } from "@/api/addContent"
import { useAuthContext } from "@/contexts/AuthContext"

enum ContentType {
  book = "book",
  movie = "movie",
  podcast = "podcast",
  article = "article",
  video = "video",
  event = "event",
  other = "other",
}

interface IFormInput {
  title: string
  type: ContentType
}

interface ContentFormProps {
  onContentAdded?: () => void;
}

export default function ContentForm({ onContentAdded }: ContentFormProps) {
  const { register, handleSubmit, reset } = useForm<IFormInput>()
  const { addContent, loading } = useAddContent()
  const { currentUser } = useAuthContext()

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    try {
      if (!currentUser) {
        throw new Error("User not authenticated")
      }
      const firebaseUid = currentUser?.uid
      
      await addContent({
        variables: {
          firebaseUid,
          title: data.title,
          type: data.type,
        },
      })
      
      console.log("Content added successfully!")
      reset()
      
      // Refetch the graph after adding content
      if (onContentAdded) {
        onContentAdded();
      }
    } catch (err) {
      console.error("Error adding content:", err)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <FieldSet>
          <FieldDescription>
            Use the form below to add new content to your collection.
          </FieldDescription>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="title">Title</FieldLabel>
              <Input 
                id="title" 
                {...register("title", { required: true })} 
                disabled={loading}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="type">Type</FieldLabel>
              <Select {...register("type")} disabled={loading}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ContentType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field orientation="horizontal">
              <Button type="submit" disabled={loading}>
                Submit
              </Button>
              <Button variant="outline" type="button" disabled={loading}>
                Cancel
              </Button>
            </Field>
          </FieldGroup>
        </FieldSet>
      </FieldGroup>
    </form>
  )
}

