// pinup-km fork: full-page AI search ("ถาม AI").
import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Anchor, Container, Group, Paper, Stack, Text, TextInput, Title } from "@mantine/core";
import { IconSearch, IconSparkles, IconExternalLink } from "@tabler/icons-react";
import { DocumentTitle } from "@/components/ui/document-title.tsx";
import { useKmSearch } from "@/features/km-search/km-search";

export default function AiSearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const [input, setInput] = useState(q);
  const { data, isFetching, isError } = useKmSearch(q, 10);

  return (
    <Container size={800} pt="xl">
      <DocumentTitle title="ถาม AI" />
      <Group gap="xs" mb="xs">
        <IconSparkles size={22} />
        <Title order={3}>ถาม AI หาเอกสาร</Title>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        พิมพ์คำถามเป็นภาษาคน AI จะพาไปหน้าที่น่าจะมีคำตอบ (เห็นเฉพาะ Space ที่คุณมีสิทธิ์)
      </Text>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParams(input.trim() ? { q: input.trim() } : {});
        }}
      >
        <TextInput
          size="md"
          autoFocus
          placeholder="เช่น ลาพักร้อนได้กี่วัน"
          leftSection={<IconSearch size={18} />}
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>

      <Stack mt="lg" gap="sm">
        {isFetching && <Text c="dimmed">กำลังหา…</Text>}
        {isError && <Text c="red">ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง</Text>}
        {!isFetching && q && data?.length === 0 && (
          <Text c="dimmed">ไม่เจอหน้าที่ตรง ลองเปลี่ยนคำถาม</Text>
        )}
        {!isFetching &&
          data?.map((r, i) => (
            <Paper key={r.url} withBorder p="md" radius="md">
              <Text size="xs" c="dimmed">
                {r.space}
              </Text>
              <Anchor component={Link} to={r.url} fw={600} size="lg">
                {i + 1}. {r.title || "ไม่มีชื่อ"}
              </Anchor>
              <Text size="sm" mt={4} style={{ whiteSpace: "pre-line" }} lineClamp={4}>
                {r.snippet}
              </Text>
              {r.drive?.map((d) => (
                <Anchor key={d.url} href={d.url} target="_blank" rel="noopener noreferrer" size="sm" mr="md">
                  <IconExternalLink size={12} /> {d.label}
                </Anchor>
              ))}
            </Paper>
          ))}
      </Stack>
    </Container>
  );
}
