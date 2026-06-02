import os

file_path = "components/FlyerCanvas.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Inject CSS Variables
old_canvas_return = """  return (
    <div className="flex flex-col items-center p-8 bg-gray-100" ref={ref}>"""

new_canvas_return = """  const themeStyles = {
    '--theme-primary': colorTheme.primary,
    '--theme-secondary': colorTheme.secondary,
    '--theme-dark': colorTheme.dark,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col items-center p-8 bg-gray-100" ref={ref} style={themeStyles}>"""

content = content.replace(old_canvas_return, new_canvas_return)

# 2. Add layoutTheme and colorTheme props to <ReportPage> instances
content = content.replace("<ReportPage \n            pageNumber", "<ReportPage layoutTheme={layoutTheme} colorTheme={colorTheme}\n            pageNumber")

# 3. Global Color Replacements (Safely using simple string replace)
# Dark Navy -> var(--theme-dark)
content = content.replace("bg-[#0d1424]", "bg-[var(--theme-dark)]")
content = content.replace("text-[#0d1424]", "text-[var(--theme-dark)]")
content = content.replace("border-[#0d1424]", "border-[var(--theme-dark)]")
content = content.replace("from-[#0d1424]", "from-[var(--theme-dark)]")

# Teal / Blue -> var(--theme-primary)
content = content.replace("bg-[#00788c]", "bg-[var(--theme-primary)]")
content = content.replace("text-[#00788c]", "text-[var(--theme-primary)]")
content = content.replace("border-[#00788c]", "border-[var(--theme-primary)]")
content = content.replace("bg-blue-600", "bg-[var(--theme-primary)]")
content = content.replace("text-blue-600", "text-[var(--theme-primary)]")
content = content.replace("border-blue-600", "border-[var(--theme-primary)]")

# Lighter Blue -> var(--theme-primary)/opacity
content = content.replace("bg-blue-50", "bg-[var(--theme-primary)]/10")
content = content.replace("bg-blue-100", "bg-[var(--theme-primary)]/20")
content = content.replace("border-blue-200", "border-[var(--theme-primary)]/30")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Python script executed successfully.")
