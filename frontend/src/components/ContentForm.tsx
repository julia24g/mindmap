import { useForm, SubmitHandler } from "react-hook-form"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
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

export default function ContentForm() {
  const { register, handleSubmit, reset } = useForm<IFormInput>()
  const { addContent, loading } = useAddContent()

  const onSubmit: SubmitHandler<IFormInput> = async (data) => {
    try {
      // TODO: Get actual userId from auth context
      const userId = "1" // Replace with actual user ID
      
      await addContent({
        variables: {
          userId,
          title: data.title,
          type: data.type,
        },
      })
      
      console.log("Content added successfully!")
      reset() // Reset form after successful submission
    } catch (err) {
      console.error("Error adding content:", err)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>Add Content</FieldLegend>
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

