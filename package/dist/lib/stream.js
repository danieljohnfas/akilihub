export function extractStreamText(chunk) {
    return chunk.choices?.map((choice) => choice.delta?.content ?? '').join('') ?? '';
}
//# sourceMappingURL=stream.js.map