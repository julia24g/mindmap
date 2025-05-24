import { neo4jDriver } from '../db/neo4j';

export async function getUserGraph(userId: string) {
  const session = neo4jDriver.session();

  try {
    const tag_to_content = await session.run(
      `
      MATCH (parent:Tag)-[subRel:HAS_SUBTAG {userId: $userId}]->(sub:Tag)
      MATCH (tag:Tag)-[:DESCRIBES]->(content:Content {userId: $userId})
      WITH COLLECT(DISTINCT sub) + COLLECT(DISTINCT parent) + COLLECT(DISTINCT tag) AS tags
      UNWIND tags AS t
      MATCH (t)-[:DESCRIBES]->(c:Content {userId: $userId})
      RETURN DISTINCT t, c
      `,
      { userId }
    );

    const tag_to_tag = await session.run(
      `
      MATCH (parent:Tag)-[r:HAS_SUBTAG {userId: $userId}]->(sub:Tag)
      RETURN COLLECT(DISTINCT r) AS subtagRels
      `,
      { userId }
    );

    const nodesMap = new Map<string, any>();
    const edges: any[] = [];

    tag_to_content.records.forEach(record => {
      const tag = record.get('t');
      const content = record.get('c');

      if (tag && !nodesMap.has(`tag_${tag.identity}`)) {
        nodesMap.set(`tag_${tag.identity}`, {
          data: { id: `tag_${tag.identity}`, label: 'Tag', name: tag.properties.name }
        });
      }

      if (content && !nodesMap.has(`content_${content.identity}`)) {
        nodesMap.set(`content_${content.identity}`, {
          data: { id: `content_${content.identity}`, label: 'Content', title: content.properties.title }
        });
      }

      if (tag && content) {
        edges.push({
          data: {
            id: `edge_describes_${tag.identity}_${content.identity}`,
            source: `tag_${tag.identity}`,
            target: `content_${content.identity}`,
            type: 'DESCRIBES'
          }
        });
      }
    });

    const subtagRels = tag_to_tag.records[0].get("subtagRels");
    subtagRels.forEach((rel: any) => {
      edges.push({
        data: {
          id: `subtag_${rel.identity}`,
          source: `tag_${rel.start}`,
          target: `tag_${rel.end}`,
          type: 'HAS_SUBTAG'
        }
      });
    });

    return {
      nodes: Array.from(nodesMap.values()),
      edges
    };
  } finally {
    await session.close();
  }
}
