import { describe, it, expect } from "vitest";
import { scrubEnv } from "./scrubber";
import { MAX_ENV_INPUT_BYTES } from "../../contracts/env-scrubber";

describe("scrubEnv Specification Matrix", () => {
  it("preserves comment-only files unchanged with 0 assignments and 0 diagnostics", () => {
    const input = "# Just a header comment\n# Another comment\n";
    const result = scrubEnv(input);
    expect(result.output).toBe(input);
    expect(result.redactedAssignments).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("preserves blank lines unchanged", () => {
    const input = "\n\n   \n\t\n";
    const result = scrubEnv(input);
    expect(result.output).toBe(input);
    expect(result.redactedAssignments).toBe(0);
    expect(result.diagnostics).toEqual([]);
  });

  it("preserves LF and CRLF line endings respectively", () => {
    const lfInput = "FOO=bar\nBAZ=qux\n";
    const lfResult = scrubEnv(lfInput);
    expect(lfResult.output).toBe("FOO=\nBAZ=\n");
    expect(lfResult.redactedAssignments).toBe(2);

    const crlfInput = "FOO=bar\r\nBAZ=qux\r\n";
    const crlfResult = scrubEnv(crlfInput);
    expect(crlfResult.output).toBe("FOO=\r\nBAZ=\r\n");
    expect(crlfResult.redactedAssignments).toBe(2);
  });

  it("handles empty values and counts them as redacted assignments", () => {
    const input = "EMPTY=\nSTILL_EMPTY=\r\n";
    const result = scrubEnv(input);
    expect(result.output).toBe("EMPTY=\nSTILL_EMPTY=\r\n");
    expect(result.redactedAssignments).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it("scrubs unquoted values", () => {
    const input = "DATABASE_URL=postgres://user:pass@localhost:5432/db\nPORT=8080\n";
    const result = scrubEnv(input);
    expect(result.output).toBe("DATABASE_URL=\nPORT=\n");
    expect(result.redactedAssignments).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it("preserves whitespace around '='", () => {
    const input = "PORT = 5432\nHOST  =  localhost\nNAME=app\n";
    const result = scrubEnv(input);
    expect(result.output).toBe("PORT = \nHOST  =  \nNAME=\n");
    expect(result.redactedAssignments).toBe(3);
    expect(result.diagnostics).toEqual([]);
  });

  it("recognizes optional export prefix and preserves it", () => {
    const input = "export API_KEY=secret123\n  export   SECRET=abc\n";
    const result = scrubEnv(input);
    expect(result.output).toBe("export API_KEY=\n  export   SECRET=\n");
    expect(result.redactedAssignments).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it("recognizes colon separator with required whitespace", () => {
    const input = "YAML_STYLE: hello\nANOTHER_COLON:   some_value\n";
    const result = scrubEnv(input);
    expect(result.output).toBe("YAML_STYLE: \nANOTHER_COLON:   \n");
    expect(result.redactedAssignments).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it("does not treat colon without whitespace as valid separator (diagnosed as unrecognized-line)", () => {
    const input = "KEY:value\n";
    const result = scrubEnv(input);
    expect(result.output).toBe("KEY:value\n");
    expect(result.redactedAssignments).toBe(0);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]).toMatchObject({
      line: 1,
      kind: "unrecognized-line",
    });
  });

  it("preserves single, double, and backtick quote delimiters while stripping content", () => {
    const input = `SINGLE='secret_value'\nDOUBLE="another_secret"\nBACKTICK=\`backtick_secret\`\n`;
    const result = scrubEnv(input);
    expect(result.output).toBe(`SINGLE=''\nDOUBLE=""\nBACKTICK=\`\`\n`);
    expect(result.redactedAssignments).toBe(3);
    expect(result.diagnostics).toEqual([]);
  });

  it("treats '#' inside quoted values as data, not as comment", () => {
    const input = `KEY1="abc#123#xyz"\nKEY2='val#ue'\nKEY3=\`data#hash\`\n`;
    const result = scrubEnv(input);
    expect(result.output).toBe(`KEY1=""\nKEY2=''\nKEY3=\`\`\n`);
    expect(result.redactedAssignments).toBe(3);
    expect(result.diagnostics).toEqual([]);
  });

  it("preserves inline comments and their exact spacing", () => {
    const input = `PORT=8080 # default development port\nTOKEN="secret"   # auth token\nEMPTY= # empty variable\n`;
    const result = scrubEnv(input);
    expect(result.output).toBe(
      `PORT= # default development port\nTOKEN=""   # auth token\nEMPTY= # empty variable\n`
    );
    expect(result.redactedAssignments).toBe(3);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles escaped quotes properly without terminating the quote prematurely", () => {
    const input = `ESCAPED="hello \\"world\\" test" # comment\nSINGLE_ESC='it\\'s fine'\n`;
    const result = scrubEnv(input);
    expect(result.output).toBe(`ESCAPED="" # comment\nSINGLE_ESC=''\n`);
    expect(result.redactedAssignments).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it("removes internal physical lines from multiline quoted values", () => {
    const input = `CERT="line one\nline two\nline three"\nNEXT=value\n`;
    const result = scrubEnv(input);
    expect(result.output).toBe(`CERT=""\nNEXT=\n`);
    expect(result.redactedAssignments).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles duplicate keys without error", () => {
    const input = "KEY=first\nKEY=second\n";
    const result = scrubEnv(input);
    expect(result.output).toBe("KEY=\nKEY=\n");
    expect(result.redactedAssignments).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles keys with '.', '-', '_', and digits", () => {
    const input = "my.service-v2_endpoint.URL=https://api.example.com\n123_456=val\n";
    const result = scrubEnv(input);
    expect(result.output).toBe("my.service-v2_endpoint.URL=\n123_456=\n");
    expect(result.redactedAssignments).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it("leaves invalid statements unchanged and records unrecognized-line diagnostics", () => {
    const input = "VALID=ok\nTHIS IS COMPLETELY INVALID\nANOTHER=valid\n";
    const result = scrubEnv(input);
    expect(result.output).toBe(
      "VALID=\nTHIS IS COMPLETELY INVALID\nANOTHER=\n"
    );
    expect(result.redactedAssignments).toBe(2);
    expect(result.diagnostics).toEqual([
      {
        line: 2,
        kind: "unrecognized-line",
        message: expect.stringContaining("line 2"),
      },
    ]);
  });

  it("leaves unterminated quotes unchanged and records unterminated-quote diagnostic", () => {
    const input = `VALID=1\nBAD="unterminated quote without closing quote\nNEXT=2\n`;
    const result = scrubEnv(input);
    expect(result.output).toBe(
      `VALID=\nBAD="unterminated quote without closing quote\nNEXT=2\n`
    );
    expect(result.redactedAssignments).toBe(1);
    expect(result.diagnostics).toEqual([
      {
        line: 2,
        kind: "unterminated-quote",
        message: expect.stringContaining("line 2"),
      },
    ]);
  });

  it("preserves UTF-8 BOM if present", () => {
    const input = "\uFEFF# Comment with BOM\nFOO=bar\n";
    const result = scrubEnv(input);
    expect(result.output.startsWith("\uFEFF")).toBe(true);
    expect(result.output).toBe("\uFEFF# Comment with BOM\nFOO=\n");
    expect(result.redactedAssignments).toBe(1);
  });

  it("handles input without trailing newline", () => {
    const input = "KEY=val";
    const result = scrubEnv(input);
    expect(result.output).toBe("KEY=");
    expect(result.redactedAssignments).toBe(1);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles even number of backslashes before quote as unescaped closing quote", () => {
    const input = `KEY="ends_with_two_backslashes\\\\"\nNEXT=123\n`;
    const result = scrubEnv(input);
    expect(result.output).toBe(`KEY=""\nNEXT=\n`);
    expect(result.redactedAssignments).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it("handles multiline quoted values with CRLF line endings", () => {
    const input = "KEY=\"line1\r\nline2\"\r\nNEXT=val\r\n";
    const result = scrubEnv(input);
    expect(result.output).toBe("KEY=\"\"\r\nNEXT=\r\n");
    expect(result.redactedAssignments).toBe(2);
    expect(result.diagnostics).toEqual([]);
  });

  it("enforces MAX_ENV_INPUT_BYTES limit", () => {
    const oversized = "A".repeat(MAX_ENV_INPUT_BYTES + 1);
    expect(() => scrubEnv(oversized)).toThrow(/maximum allowed size/i);
  });
});
