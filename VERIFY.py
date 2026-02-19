#!/usr/bin/env python3
"""
TEBEX FILE DOWNLOADER - CHROME EXTENSION
Complete Setup Verification Script
Run this to verify everything is installed correctly
"""

import os
import json
from pathlib import Path

class TebexExtensionVerifier:
    def __init__(self, extension_path):
        self.path = Path(extension_path)
        self.results = {
            'passed': [],
            'warnings': [],
            'errors': []
        }

    def verify_files(self):
        """Verify all required files exist"""
        required_files = {
            'manifest.json': 'Extension configuration',
            'popup.html': 'User interface',
            'popup.js': 'Download logic',
            'content-script.js': 'Content extraction',
            'background.js': 'Background worker'
        }

        for filename, description in required_files.items():
            filepath = self.path / filename
            if filepath.exists():
                self.results['passed'].append(f"✓ {filename} ({description})")
            else:
                self.results['errors'].append(f"✗ MISSING: {filename} ({description})")

    def verify_manifest(self):
        """Verify manifest.json is valid"""
        manifest_path = self.path / 'manifest.json'

        try:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)

            # Check required fields
            if manifest.get('manifest_version') == 3:
                self.results['passed'].append("✓ Manifest version 3 (correct)")
            else:
                self.results['errors'].append("✗ Manifest version is not 3")

            if manifest.get('name'):
                self.results['passed'].append(f"✓ Extension name: {manifest['name']}")

            if manifest.get('version'):
                self.results['passed'].append(f"✓ Version: {manifest['version']}")

            # Check permissions
            required_perms = ['activeTab', 'scripting', 'downloads']
            if all(p in manifest.get('permissions', []) for p in required_perms):
                self.results['passed'].append("✓ All required permissions present")
            else:
                self.results['warnings'].append("⚠ Some permissions may be missing")

        except json.JSONDecodeError:
            self.results['errors'].append("✗ manifest.json is not valid JSON")
        except FileNotFoundError:
            self.results['errors'].append("✗ manifest.json not found")

    def verify_documentation(self):
        """Verify documentation files exist"""
        docs = {
            'README.md': 'Full documentation',
            'QUICKSTART.md': 'Quick start guide',
            'SETUP.md': 'Setup guide',
            'INDEX.md': 'Documentation index',
            'VISUAL-GUIDE.md': 'Visual setup guide'
        }

        for filename, description in docs.items():
            filepath = self.path / filename
            if filepath.exists():
                self.results['passed'].append(f"✓ {filename} ({description})")
            else:
                self.results['warnings'].append(f"⚠ Missing documentation: {filename}")

    def verify_code_structure(self):
        """Verify JavaScript files have proper structure"""
        files_to_check = {
            'popup.js': ['downloadBtn', 'downloadAllFiles', 'getMimeType'],
            'content-script.js': ['extractFileContent', 'chrome.runtime.onMessage']
        }

        for filename, expected_items in files_to_check.items():
            filepath = self.path / filename
            if filepath.exists():
                with open(filepath, 'r') as f:
                    content = f.read()

                missing = [item for item in expected_items if item not in content]

                if not missing:
                    self.results['passed'].append(f"✓ {filename} has required functions")
                else:
                    self.results['warnings'].append(f"⚠ {filename} may be missing: {', '.join(missing)}")

    def check_file_count(self):
        """Check total file count"""
        total_files = len(list(self.path.glob('*')))
        self.results['passed'].append(f"✓ Total files: {total_files}")

    def run_all_checks(self):
        """Run all verification checks"""
        print("=" * 60)
        print("TEBEX FILE DOWNLOADER - EXTENSION VERIFICATION")
        print("=" * 60)
        print()

        print("🔍 Verifying extension files...")
        self.verify_files()
        print()

        print("📋 Checking manifest configuration...")
        self.verify_manifest()
        print()

        print("📚 Checking documentation...")
        self.verify_documentation()
        print()

        print("💻 Verifying code structure...")
        self.verify_code_structure()
        print()

        print("📦 Checking file count...")
        self.check_file_count()
        print()

        # Print results
        print("=" * 60)
        print("RESULTS")
        print("=" * 60)
        print()

        print("✅ PASSED CHECKS:")
        for item in self.results['passed']:
            print(f"  {item}")
        print()

        if self.results['warnings']:
            print("⚠️  WARNINGS:")
            for item in self.results['warnings']:
                print(f"  {item}")
            print()

        if self.results['errors']:
            print("❌ ERRORS:")
            for item in self.results['errors']:
                print(f"  {item}")
            print()

        # Summary
        print("=" * 60)
        print("SUMMARY")
        print("=" * 60)

        total = len(self.results['passed']) + len(self.results['warnings']) + len(self.results['errors'])
        passed = len(self.results['passed'])

        if not self.results['errors']:
            print("✅ EXTENSION READY TO USE!")
            print()
            print("Next steps:")
            print("1. Open Chrome → chrome://extensions/")
            print("2. Enable 'Developer mode'")
            print("3. Click 'Load unpacked'")
            print(f"4. Select: {self.path}")
            print("5. Go to Tebex editor and click the extension")
        else:
            print("❌ EXTENSION HAS ISSUES")
            print("Please fix the errors above and try again.")

        print()
        print(f"Check results: {passed}/{total} passed")
        print()


if __name__ == '__main__':
    # Get current extension path
    extension_path = os.path.dirname(os.path.abspath(__file__))

    verifier = TebexExtensionVerifier(extension_path)
    verifier.run_all_checks()

