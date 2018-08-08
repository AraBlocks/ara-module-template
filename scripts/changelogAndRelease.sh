#!/usr/bin/env bash

echo 'asdfasdfasdf'
# npm run changelog -M

git add CHANGELOG.md

git commit -m "chore(): Update CHANGELOG.md $(date '+%Y-%m-%d')"

UPDATE=`npm version major 2>&1`

if [[ "$UPDATE" == *"npm ERR!"* ]]; then
echo
echo "!!! Undo CHANGELOG.md commit !!!"
git reset HEAD~1 --soft
echo
echo $UPDATE
echo
exit 1
fi

git push origin $(git branch 2>/dev/null| sed -n '/^\\*/s/^\\* //p')

git push --tags

exit 0