"""
Compatibility module for Windows Smart App Control (SAC) / Application Control.
Handles unsigned Cython .pyd fallbacks in SQLAlchemy and filters PyTorch's unused dummy DLL.
"""
import sys
import os
import glob
import importlib.util

# 1. PyTorch DLL loader compatibility
# torch_global_deps.dll is an unused dummy stub on Windows that triggers WinError 4551 under Smart App Control
if not getattr(glob, "_sac_patched", False):
    orig_glob = glob.glob
    def _safe_glob(pathname, *args, **kwargs):
        res = orig_glob(pathname, *args, **kwargs)
        return [p for p in res if not (isinstance(p, str) and p.endswith("torch_global_deps.dll"))]
    glob.glob = _safe_glob
    glob._sac_patched = True

# 2. SQLAlchemy Cython fallback to pure Python
class _SACCompatFinder:
    @classmethod
    def find_spec(cls, fullname, path=None, target=None):
        if fullname.startswith("sqlalchemy.") and fullname.endswith("_cy") and path:
            for p in path:
                mod_name = fullname.split(".")[-1]
                py_file = os.path.join(p, mod_name + ".py")
                if os.path.exists(py_file):
                    return importlib.util.spec_from_file_location(fullname, py_file)
        return None

if not any(getattr(m, "__name__", "") == "_SACCompatFinder" for m in sys.meta_path):
    sys.meta_path.insert(0, _SACCompatFinder)

