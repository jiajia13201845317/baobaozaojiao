"use client";

import { useState } from "react";
import { Check, Plus, Trash2, UserRound } from "lucide-react";
import { ROLE_NAME, ROLE_WHAT, type Carer, type CarerRole } from "@/lib/grow/settings";

const ROLES: CarerRole[] = ["owner", "carer", "viewer"];

/**
 * 6.1 多看护人协同, as far as one device can take it.
 *
 * There is no server in this build, so nothing syncs between phones. What is
 * real here is the part the plan says has to exist underneath: records carry a
 * 记录人, roles decide who may delete, and every change lands in the log. That
 * is also the honest half to ship first — a shared family account whose
 * members cannot actually see each other's writes would be worse than saying
 * plainly that this phone is the one keeping the book.
 */
export function CarerPanel({
  carers,
  by,
  onAdd,
  onEdit,
  onRemove,
  onSetBy,
}: {
  carers: Carer[];
  by: string | null;
  onAdd: (name: string, role: CarerRole) => void;
  onEdit: (id: string, patch: { name?: string; role?: CarerRole }) => void;
  onRemove: (id: string) => void;
  onSetBy: (id: string | null) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<CarerRole>("carer");
  const [confirm, setConfirm] = useState<string | null>(null);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, role);
    setName("");
    setRole("carer");
    setAdding(false);
  };

  return (
    <div className="g-scroll">
      <p className="g-note">
        家里几个人轮着记的时候，加上名字，每条记录就会带上是谁填的，翻回去能对上。名字只存在这台设备上，不会同步到别处——这一版还没有账号，换一台手机看不到这边的记录。
      </p>

      {carers.length > 0 && (
        <section className="g-card">
          <div className="g-card-head">
            <h2 className="g-h2">现在是谁在记</h2>
          </div>
          <div className="carer-pick">
            {carers.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`pick${by === c.id ? " on" : ""}`}
                onClick={() => onSetBy(c.id)}
              >
                {by === c.id && <Check className="size-4" />}
                {c.name}
              </button>
            ))}
          </div>
          <p className="g-hint">选中的人会写进接下来的每条记录里。换人记的时候点一下就好。</p>
        </section>
      )}

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">成员</h2>
          <span className="g-sub">{carers.length ? `${carers.length} 人` : "还没有人"}</span>
        </div>

        {!carers.length && (
          <div className="g-empty">
            <span className="g-empty-ring" />
            <p className="g-empty-title">还没有加人</p>
            <p className="g-empty-sub">一个人记的话不加也行，记录照样保存。</p>
          </div>
        )}

        <ul className="carer-list">
          {carers.map((c) => (
            <li key={c.id} className="carer-row">
              <span className="carer-face">
                <UserRound className="size-5" />
              </span>
              <span className="carer-text">
                <span className="carer-name">{c.name}</span>
                <span className="carer-what">{ROLE_WHAT[c.role]}</span>
                <span className="carer-roles">
                  {ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`carer-role${c.role === r ? " on" : ""}`}
                      onClick={() => onEdit(c.id, { role: r })}
                    >
                      {ROLE_NAME[r]}
                    </button>
                  ))}
                </span>
              </span>
              {confirm === c.id ? (
                <span className="row-confirm">
                  <button type="button" className="g-btn g-btn-warn" onClick={() => { onRemove(c.id); setConfirm(null); }}>
                    删掉
                  </button>
                  <button type="button" className="g-btn g-btn-ghost" onClick={() => setConfirm(null)}>
                    算了
                  </button>
                </span>
              ) : (
                <button type="button" className="row-del" onClick={() => setConfirm(c.id)} aria-label={`删掉 ${c.name}`}>
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>

        {adding ? (
          <div className="carer-form">
            <label className="g-field">
              <span>名字或称呼</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
                placeholder="妈妈、外婆、月嫂…"
                autoFocus
              />
            </label>
            <div className="pick-row">
              {ROLES.map((r) => (
                <button key={r} type="button" className={`pick${role === r ? " on" : ""}`} onClick={() => setRole(r)}>
                  {ROLE_NAME[r]}
                </button>
              ))}
            </div>
            <p className="g-hint">{ROLE_WHAT[role]}</p>
            <div className="measure-actions">
              <button type="button" className="g-btn g-btn-go" onClick={save} disabled={!name.trim()}>
                加进来
              </button>
              <button type="button" className="g-btn g-btn-ghost" onClick={() => setAdding(false)}>
                取消
              </button>
            </div>
            {!name.trim() && <p className="g-hint">还差一个名字</p>}
          </div>
        ) : (
          <button type="button" className="g-btn g-btn-ghost" onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            加一个人
          </button>
        )}
      </section>

      <section className="g-card">
        <div className="g-card-head">
          <h2 className="g-h2">三种权限的区别</h2>
        </div>
        <ul className="carer-help">
          {ROLES.map((r) => (
            <li key={r}>
              <span className="carer-help-name">{ROLE_NAME[r]}</span>
              <span className="carer-help-what">{ROLE_WHAT[r]}</span>
            </li>
          ))}
        </ul>
        <p className="g-hint">
          只看这一档是给亲戚看照片用的，省得一不小心把记录改了。删档案、删记录这类不可恢复的动作只有管理员能做。
        </p>
      </section>
    </div>
  );
}
