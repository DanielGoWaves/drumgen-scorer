#!/bin/bash
# Script to add or remove DEV badge from App.jsx

ACTION=$1

APP_JSX="frontend/src/App.jsx"
TEMP_FILE=$(mktemp)

if [ "$ACTION" = "remove" ]; then
    # Remove DEV badge - restore original structure
    awk '
    /DEV_BADGE_START/ { skip=1; next }
    /DEV_BADGE_END/ { skip=0; next }
    skip { next }
    /display: '\''flex'\'', alignItems: '\''center'\'', gap: '\''12px'\''/ {
        gsub(/<div style={{ display: '\''flex'\'', alignItems: '\''center'\'', gap: '\''12px'\'', zIndex: 1 }}>/, "")
        next
    }
    /margin: 0/ {
        gsub(/margin: 0/, "fontSize: '\''24px'\'', fontWeight: '\''700'\'', zIndex: 1")
    }
    /<\/div>.*DEV_BADGE/ {
        gsub(/<\/div>/, "")
        print "</h1>"
        next
    }
    { print }
    ' "$APP_JSX" > "$TEMP_FILE" && mv "$TEMP_FILE" "$APP_JSX"
    
    echo "✓ DEV badge removed"
    
elif [ "$ACTION" = "add" ]; then
    # Add DEV badge - only if not already present
    if ! grep -q "DEV_BADGE_START" "$APP_JSX"; then
        awk '
        /<h1 style={{ fontSize: '\''24px'\'', fontWeight: '\''700'\'', zIndex: 1 }}>/ {
            print "        <div style={{ display: '\''flex'\'', alignItems: '\''center'\'', gap: '\''12px'\'', zIndex: 1 }}>"
            gsub(/zIndex: 1/, "margin: 0")
            print
            next
        }
        /<\/h1>/ && !seen {
            print
            print "          {/* DEV_BADGE_START */}"
            print "          <div style={{"
            print "            backgroundColor: '\''rgba(239, 68, 68, 0.9)'\'',"
            print "            color: '\''white'\'',"
            print "            padding: '\''4px 10px'\'',"
            print "            borderRadius: '\''4px'\'',"
            print "            fontSize: '\''11px'\'',"
            print "            fontWeight: '\''700'\'',"
            print "            letterSpacing: '\''0.5px'\'',"
            print "            textTransform: '\''uppercase'\'',"
            print "            boxShadow: '\''0 2px 4px rgba(0, 0, 0, 0.2)'\''"
            print "          }}>"
            print "            DEV"
            print "          </div>"
            print "          {/* DEV_BADGE_END */}"
            print "        </div>"
            seen=1
            next
        }
        { print }
        ' "$APP_JSX" > "$TEMP_FILE" && mv "$TEMP_FILE" "$APP_JSX"
        
        echo "✓ DEV badge added"
    else
        echo "ℹ️  DEV badge already present"
    fi
fi

rm -f "$TEMP_FILE"

