import React from 'react'

export default function AnchorBar({ anchors, onAnchorClick }) {
  if (anchors.length === 0) return null

  return (
    <div className="anchor-bar">
      {anchors.map((anchor, index) => (
        <button
          key={anchor.id}
          className="anchor-tab"
          title={anchor.text}
          onClick={() => onAnchorClick(anchor.id)}
        >
          <span className="anchor-num">{index + 1}</span>
          <span className="anchor-label">{anchor.text}</span>
        </button>
      ))}
    </div>
  )
}
