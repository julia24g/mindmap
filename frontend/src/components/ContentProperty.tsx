import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"

export default function ContentProperty({ propertyTitle, propertyValue }: { propertyTitle: string; propertyValue: string }) {
  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <Item size="sm">
        <ItemContent className="flex-none">
          <ItemTitle>{propertyTitle}</ItemTitle>
        </ItemContent>
        <ItemContent>
          <ItemDescription>
            {propertyValue}
          </ItemDescription>
        </ItemContent>
      </Item>
    </div>
  );
}