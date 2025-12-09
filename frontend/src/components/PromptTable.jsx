import React from 'react';

export default function PromptTable({ prompts }) {
  if (!prompts.length) return <p>No prompts found.</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={th}>ID</th>
          <th style={th}>Prompt</th>
          <th style={th}>Difficulty</th>
          <th style={th}>Category</th>
          <th style={th}>Used</th>
        </tr>
      </thead>
      <tbody>
        {prompts.map((p) => (
          <tr key={p.id}>
            <td style={td}>{p.id}</td>
            <td style={td}>{p.text}</td>
            <td style={td}>{p.difficulty}</td>
            <td style={td}>{p.category || '-'}</td>
            <td style={td}>{p.used_count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th = { textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px' };
const td = { borderBottom: '1px solid #eee', padding: '8px', verticalAlign: 'top' };

