import re
import os
from pathlib import Path

class SafeOutputFilter:
    def __init__(self):
        self.project_root = Path(os.getcwd())
        self.patterns = [
            # Remove absolute paths
            (r'(/[^\s]+)', self._sanitize_path),
            # Remove username references
            (r'/home/[^/\s]+', '/home/user'),
            # Remove specific environment variables
            (r'([A-Z_]+)=([^\s]+)', self._sanitize_env_var),
            # Remove system details
            (r'(Linux|Darwin|Windows).*?(\d+\.\d+\.\d+)', 'OS version'),
            # Remove IP addresses
            (r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b', 'xxx.xxx.xxx.xxx'),
            # Remove potential user directories
            (r'Users/[^/\s]+', 'Users/user'),
            # Remove hostname patterns
            (r'(?i)(hostname|host)[:=\s]+[^\s]+', r'\1: [hidden]'),
        ]
        
    def _sanitize_path(self, match):
        path = match.group(1)
        try:
            # If the path is within our project, make it relative
            if path.startswith(str(self.project_root)):
                return os.path.relpath(path, self.project_root)
            else:
                # Otherwise, just return the last component
                return os.path.basename(path)
        except:
            return '[path]'
    
    def _sanitize_env_var(self, match):
        var_name = match.group(1)
        # Keep some safe environment variables
        safe_vars = ['PATH', 'PYTHONPATH', 'LANG', 'LC_ALL']
        if var_name in safe_vars:
            return match.group(0)
        else:
            return f"{var_name}=[hidden]"
    
    def filter_line(self, line):
        """Filter a single line of output"""
        filtered_line = line
        for pattern, replacement in self.patterns:
            if callable(replacement):
                filtered_line = re.sub(pattern, replacement, filtered_line)
            else:
                filtered_line = re.sub(pattern, replacement, filtered_line)
        return filtered_line
    
    def filter_text(self, text):
        """Filter multiple lines of output"""
        lines = text.split('\n')
        return '\n'.join(self.filter_line(line) for line in lines)