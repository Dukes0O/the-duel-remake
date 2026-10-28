# QA-FACTORY-RECYCLE-JUNCTION

Low backlog; no source started. Actual QA-STOCK-SNOW merge5a85be03 and shared metadata603ca48a succeeded, then integrate-lane cleanup failed in its existing Windows PowerShell5 noninteractive Remove-Item junction call because it prompted for child recursion. Source lane remained intact and target was safe. This is not the separate HELI watcher/access-denied issue.

Root validated its newly created clean merged qa-stock-snow absolute path and exact integration-only node_modules Junction target, unlinked only the junction via DirectoryInfo.Delete(), verified target intact, recycled the lane through SendToRecycleBin, then dry-run proved only its missing registration before prune and safe branch deletion. Cleanup completed; no ACL change, force/permanent delete or foreign lane touched.

Future narrow owns: tools/integrate-lane.mjs unlinkJunction hook and its existing tools/test-integrate-lane.mjs cases, own change note. Preserve exact current-run receipts, clean/merged checks, path/target validation, Recycle Bin-only behavior and registration checks. Use the verified directory-junction unlink without a recursion prompt; no generic recursive-delete helper or bypass. One review, nearby/jobs4 and build before merge.
