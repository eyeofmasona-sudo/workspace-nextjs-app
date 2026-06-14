#!/bin/bash
# Start Agent OS in development mode
# Run from the project root directory
cd "$(dirname "$0")"
exec npx next dev -p 3000
