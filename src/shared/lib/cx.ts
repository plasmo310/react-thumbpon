/**
 * class 名を繋ぐ。false / null / undefined は捨てるので、条件付きの指定をそのまま書ける。
 * これだけのためにライブラリを足さない。
 *
 * @param values 繋ぎたい class 名。条件式の結果をそのまま渡してよい
 */
export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ')
}
