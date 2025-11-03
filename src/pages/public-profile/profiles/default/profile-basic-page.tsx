import { Fragment } from 'react';
import { useAuth } from '@/auth/context/auth-context';
import { PageMenu } from '@/pages/public-profile';
import { UserHero } from '@/partials/common/user-hero';
import { DropdownMenu9 } from '@/partials/dropdown-menu/dropdown-menu-9';
import { Navbar, NavbarActions } from '@/partials/navbar/navbar';
import {
  EllipsisVertical,
  Luggage,
  Mail,
  MapPin,
  MessageSquareText,
  Users,
} from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/common/container';
import { ProfileDefaultContent } from '.';

export function ProfileDefaultPage() {
  const { user, profile } = useAuth();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const displayEmail = user?.email || '';
  const displayAvatar = profile?.avatar_url || toAbsoluteUrl('/media/avatars/300-1.png');

  const image = (
    <img
      src={displayAvatar}
      className="rounded-full border-3 border-green-500 size-[100px] shrink-0"
      alt={displayName}
    />
  );

  return (
    <Fragment>
      <UserHero
        name={displayName}
        image={image}
        info={[
          { label: profile?.timezone || 'Europe/Madrid', icon: MapPin },
          { email: displayEmail, icon: Mail },
        ]}
      />
      <Container>
        <Navbar>
          <PageMenu />
          <NavbarActions>
            <Button>
              <Users /> Connect
            </Button>
            <Button variant="outline" mode="icon">
              <MessageSquareText />
            </Button>
            <DropdownMenu9
              trigger={
                <Button variant="outline" mode="icon">
                  <EllipsisVertical />
                </Button>
              }
            />
          </NavbarActions>
        </Navbar>
      </Container>
      <Container>
        <ProfileDefaultContent />
      </Container>
    </Fragment>
  );
}
